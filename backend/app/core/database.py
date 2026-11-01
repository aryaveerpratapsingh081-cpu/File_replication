import json
import logging
import copy
from pathlib import Path
from typing import Any, Optional
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings

logger = logging.getLogger("selfheal.database")

class MockCursor:
    def __init__(self, docs: list[dict]):
        self._docs = docs
        self._pos = 0

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, str):
            key = key_or_list
            reverse = (direction == -1)
        elif isinstance(key_or_list, list) and len(key_or_list) > 0:
            key, d = key_or_list[0]
            reverse = (d == -1)
        else:
            return self
        
        def sort_key(d):
            val = d.get(key)
            if val is None:
                return ""
            return val

        self._docs = sorted(self._docs, key=sort_key, reverse=reverse)
        return self

    def limit(self, n: int):
        self._docs = self._docs[:n]
        return self

    def skip(self, n: int):
        self._docs = self._docs[n:]
        return self

    def __iter__(self):
        return iter(self._docs)

    def __len__(self):
        return len(self._docs)

class LocalMongoCollection:
    def __init__(self, name: str, store: "LocalMongoStore"):
        self.name = name
        self.store = store

    def _matches(self, doc: dict, query: dict) -> bool:
        if not query:
            return True
        for k, v in query.items():
            if k == "$or" and isinstance(v, list):
                if not any(self._matches(doc, cond) for cond in v):
                    return False
                continue
            if isinstance(v, dict):
                # Simple operator support ($ne, $in, $gte, $lte)
                doc_val = doc.get(k)
                for op, op_val in v.items():
                    if op == "$ne" and doc_val == op_val:
                        return False
                    elif op == "$in" and doc_val not in op_val:
                        return False
                    elif op == "$nin" and doc_val in op_val:
                        return False
                    elif op == "$gt" and not (doc_val is not None and doc_val > op_val):
                        return False
                    elif op == "$gte" and not (doc_val is not None and doc_val >= op_val):
                        return False
                    elif op == "$lt" and not (doc_val is not None and doc_val < op_val):
                        return False
                    elif op == "$lte" and not (doc_val is not None and doc_val <= op_val):
                        return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    def find_one(self, query: Optional[dict] = None) -> Optional[dict]:
        query = query or {}
        for doc in self.store.data.get(self.name, []):
            if self._matches(doc, query):
                return copy.deepcopy(doc)
        return None

    def find(self, query: Optional[dict] = None) -> MockCursor:
        query = query or {}
        results = [
            copy.deepcopy(doc)
            for doc in self.store.data.get(self.name, [])
            if self._matches(doc, query)
        ]
        return MockCursor(results)

    def insert_one(self, doc: dict):
        if self.name not in self.store.data:
            self.store.data[self.name] = []
        new_doc = copy.deepcopy(doc)
        if "_id" not in new_doc:
            import uuid
            new_doc["_id"] = str(uuid.uuid4())
        self.store.data[self.name].append(new_doc)
        self.store.save()
        class Result:
            inserted_id = new_doc["_id"]
        return Result()

    def update_one(self, query: dict, update: dict, upsert: bool = False):
        if self.name not in self.store.data:
            self.store.data[self.name] = []

        target_idx = None
        for i, doc in enumerate(self.store.data[self.name]):
            if self._matches(doc, query):
                target_idx = i
                break

        if target_idx is not None:
            doc = self.store.data[self.name][target_idx]
            if "$set" in update:
                doc.update(update["$set"])
            if "$inc" in update:
                for k, inc_val in update["$inc"].items():
                    doc[k] = doc.get(k, 0) + inc_val
            if "$push" in update:
                for k, item in update["$push"].items():
                    if k not in doc or not isinstance(doc[k], list):
                        doc[k] = []
                    doc[k].append(item)
            self.store.save()
            class Result:
                matched_count = 1
                modified_count = 1
            return Result()
        elif upsert:
            new_doc = copy.deepcopy(query)
            if "$set" in update:
                new_doc.update(update["$set"])
            self.insert_one(new_doc)
            class Result:
                matched_count = 0
                modified_count = 1
                upserted_id = new_doc.get("_id")
            return Result()
        
        class Result:
            matched_count = 0
            modified_count = 0
        return Result()

    def delete_one(self, query: dict):
        if self.name not in self.store.data:
            return
        for i, doc in enumerate(self.store.data[self.name]):
            if self._matches(doc, query):
                del self.store.data[self.name][i]
                self.store.save()
                break

    def delete_many(self, query: dict):
        if self.name not in self.store.data:
            return
        remaining = [doc for doc in self.store.data[self.name] if not self._matches(doc, query)]
        self.store.data[self.name] = remaining
        self.store.save()

    def count_documents(self, query: Optional[dict] = None) -> int:
        return len(list(self.find(query)))

    def create_index(self, *args, **kwargs):
        pass

class LocalMongoStore:
    def __init__(self, persistence_file: Path):
        self.persistence_file = persistence_file
        self.data: dict[str, list[dict]] = {}
        self.load()

    def load(self):
        if self.persistence_file.exists():
            try:
                with open(self.persistence_file, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load local store: {e}")
                self.data = {}

    def save(self):
        try:
            self.persistence_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.persistence_file, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to persist local store: {e}")

    def __getitem__(self, name: str) -> LocalMongoCollection:
        return LocalMongoCollection(name, self)

class DatabaseManager:
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db: Any = None
        self.is_connected: bool = False
        self.is_fallback: bool = False
        self.connection_error: Optional[str] = None

    def connect(self):
        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
            client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=1500,
                connectTimeoutMS=1500,
            )
            # Trigger server connection check
            client.admin.command("ping")
            self.client = client
            self.db = client[settings.DATABASE_NAME]
            self.is_connected = True
            self.is_fallback = False
            self.connection_error = None
            logger.info("Successfully connected to live MongoDB!")
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            logger.warning(
                f"Live MongoDB not reachable ({e}). Engaging embedded document store fallback with file persistence."
            )
            backup_path = Path(settings.STORAGE_PATH) / "local_db.json"
            self.db = LocalMongoStore(backup_path)
            self.is_connected = True
            self.is_fallback = True
            self.connection_error = str(e)

    def get_collection(self, collection_name: str):
        if self.db is None:
            self.connect()
        return self.db[collection_name]

db_manager = DatabaseManager()

def get_db():
    if db_manager.db is None:
        db_manager.connect()
    return db_manager.db

