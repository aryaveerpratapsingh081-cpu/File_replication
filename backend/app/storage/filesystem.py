import hashlib
import os
import shutil
from pathlib import Path
from typing import Optional
from app.core.config import settings

class StorageFileSystem:
    def __init__(self, base_storage_dir: Optional[str] = None):
        self.base_dir = Path(base_storage_dir or settings.STORAGE_PATH).resolve()
        self.nodes_dir = self.base_dir / "nodes"
        self.nodes_dir.mkdir(parents=True, exist_ok=True)

    def init_node_storage(self, node_id: str) -> Path:
        node_dir = self.nodes_dir / node_id
        node_dir.mkdir(parents=True, exist_ok=True)
        return node_dir

    def _get_replica_path(self, node_id: str, file_id: str, replica_id: str) -> Path:
        safe_node = os.path.basename(node_id)
        safe_file = os.path.basename(file_id)
        safe_replica = os.path.basename(replica_id)
        node_dir = self.nodes_dir / safe_node
        node_dir.mkdir(parents=True, exist_ok=True)
        return node_dir / f"{safe_file}_{safe_replica}.dat"

    def calculate_checksum(self, data: bytes) -> str:
        sha256 = hashlib.sha256()
        sha256.update(data)
        return sha256.hexdigest()

    def calculate_file_checksum(self, filepath: Path) -> str:
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()

    def write_replica(self, node_id: str, file_id: str, replica_id: str, data: bytes) -> tuple[int, str]:
        path = self._get_replica_path(node_id, file_id, replica_id)
        with open(path, "wb") as f:
            f.write(data)
        checksum = self.calculate_checksum(data)
        return len(data), checksum

    def read_replica(self, node_id: str, file_id: str, replica_id: str) -> bytes:
        path = self._get_replica_path(node_id, file_id, replica_id)
        if not path.exists():
            raise FileNotFoundError(f"Replica file not found at {path}")
        with open(path, "rb") as f:
            return f.read()

    def delete_replica(self, node_id: str, file_id: str, replica_id: str) -> bool:
        path = self._get_replica_path(node_id, file_id, replica_id)
        if path.exists():
            try:
                path.unlink()
                return True
            except OSError:
                return False
        return False

    def get_node_disk_usage_mb(self, node_id: str) -> float:
        node_dir = self.nodes_dir / os.path.basename(node_id)
        if not node_dir.exists():
            return 0.0
        total_bytes = sum(f.stat().st_size for f in node_dir.glob("*.dat") if f.is_file())
        return round(total_bytes / (1024 * 1024), 2)

    def corrupt_replica_bytes(self, node_id: str, file_id: str, replica_id: str) -> tuple[str, str]:
        """Deliberately flips bytes in a replica file for demonstration."""
        path = self._get_replica_path(node_id, file_id, replica_id)
        if not path.exists():
            raise FileNotFoundError(f"Replica file {replica_id} does not exist on {node_id}")

        with open(path, "rb") as f:
            content = bytearray(f.read())

        original_hash = self.calculate_checksum(bytes(content))

        if len(content) > 0:
            # Flip byte at index 0 or append
            content[0] = (content[0] ^ 0xFF)
        else:
            content.extend(b"[CORRUPTED_BYTES_INJECTED]")

        with open(path, "wb") as f:
            f.write(content)

        corrupted_hash = self.calculate_checksum(bytes(content))
        return original_hash, corrupted_hash

    def repair_replica_bytes(
        self,
        target_node_id: str,
        file_id: str,
        target_replica_id: str,
        source_node_id: str,
        source_replica_id: str
    ) -> str:
        """Copies verified bytes from a healthy source replica to the target replica."""
        source_path = self._get_replica_path(source_node_id, file_id, source_replica_id)
        if not source_path.exists():
            raise FileNotFoundError(f"Healthy source replica not found at {source_path}")

        target_path = self._get_replica_path(target_node_id, file_id, target_replica_id)
        shutil.copy2(source_path, target_path)

        return self.calculate_file_checksum(target_path)

    def reset_all_storage(self):
        if self.nodes_dir.exists():
            shutil.rmtree(self.nodes_dir)
        self.nodes_dir.mkdir(parents=True, exist_ok=True)

storage_fs = StorageFileSystem()

