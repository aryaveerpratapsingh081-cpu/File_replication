import pytest
import asyncio
from app.core.database import db_manager
from app.services.cluster_service import cluster_service
from app.services.file_service import file_service
from app.services.recovery_service import recovery_service
from app.storage.filesystem import storage_fs

@pytest.fixture(autouse=True)
def setup_teardown():
    db_manager.connect()
    cluster_service.initialize_cluster()
    for n in cluster_service.get_all_nodes():
        cluster_service.restore_node(n["node_id"])
    yield

def test_file_upload_and_persistence():
    async def _test():
        test_content = b"TEST_PAYLOAD_FOR_DISTRIBUTED_STORAGE_VERIFICATION"
        meta, pipeline = await file_service.upload_file(
            filename="test_dataset.csv",
            content=test_content,
            importance="Critical",
            write_mode="PARALLEL_PUSH"
        )

        assert meta.file_id is not None
        assert meta.importance == "Critical"
        assert meta.target_replication_factor == 4  # Critical baseline is 4
        assert len(meta.replica_locations) == 4
        assert meta.checksum == storage_fs.calculate_checksum(test_content)
        assert pipeline.success_count == 4

        # Verify download succeeds with exact content
        downloaded_data, filename, _ = file_service.download_file(meta.file_id)
        assert downloaded_data == test_content
        assert filename == "test_dataset.csv"

    asyncio.run(_test())

def test_corruption_detection_and_self_healing():
    async def _test():
        content = b"RESILIENT_SECRET_RECORDS_DATA"
        meta, _ = await file_service.upload_file(
            filename="secure_records.dat",
            content=content,
            importance="Standard"
        )

        # Inject corruption into one of the replicas
        corrupt_result = file_service.simulate_corruption(meta.file_id)
        assert corrupt_result.status == "CORRUPTED"
        assert corrupt_result.original_checksum != corrupt_result.tampered_checksum

        # Run integrity verification & repair
        verify_result = file_service.verify_and_repair_integrity(meta.file_id)
        assert verify_result.repaired is True
        assert corrupt_result.corrupted_node_id in verify_result.corrupted_replicas

        # Verify download serves correct data after repair
        data_after, _, _ = file_service.download_file(meta.file_id)
        assert data_after == content

    asyncio.run(_test())

def test_node_failure_and_recovery_queue():
    async def _test():
        content = b"DATA_TO_RECOVER_AFTER_NODE_STOP"
        meta, _ = await file_service.upload_file(
            filename="node_fail_test.bin",
            content=content,
            importance="Critical"
        )

        primary_node = meta.replica_locations[0]
        # Simulate stopping the node holding the primary replica
        cluster_service.simulate_node_failure(primary_node)

        # simulate_node_failure automatically engages recovery_service.scan_and_schedule_recoveries()
        queued_jobs = recovery_service.get_queued_jobs()
        assert len(queued_jobs) >= 1
        target_job = next(j for j in queued_jobs if j["file_id"] == meta.file_id)
        assert target_job["missing_replicas"] >= 1
        assert target_job["urgency_score"] > 1000

        # Execute recovery
        recovered_jobs = recovery_service.run_all_queued()
        assert len(recovered_jobs) >= 1

        # Verify file has recovered replica on a surviving node
        updated_file = file_service.get_file(meta.file_id)
        assert updated_file["surviving_replica_count"] == updated_file["target_replication_factor"]

    asyncio.run(_test())

def test_file_deletion():
    async def _test():
        content = b"DATA_TO_BE_DELETED"
        meta, _ = await file_service.upload_file(
            filename="temp_delete_me.txt",
            content=content,
            importance="Standard"
        )

        deleted = file_service.delete_file(meta.file_id)
        assert deleted is True

        # File should no longer exist
        assert file_service.get_file(meta.file_id) is None

    asyncio.run(_test())
