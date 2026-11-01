# Fault-Tolerant Distributed File Storage System with Adaptive Replication and Predictive Self-Healing Recovery ("SelfHeal Storage")

A distributed file storage prototype combining **rule-based adaptive replication**, **OLS linear regression health trend analysis**, **load- and failure-domain diversity placement**, **urgency-ranked priority queue self-healing**, and **SHA-256 data integrity validation**.

---

## 1. Project Overview

Modern distributed file systems (such as HDFS, Ceph, and Google File System) frequently rely on static replication factors (e.g., fixed $3\times$) and reactive failure detection (triggering recovery only after complete node timeout or heartbeats lapse). This results in:
- High storage overhead for cold/dormant files.
- Bottlenecks for critical or hot files under burst traffic.
- Sudden network saturations when recovering multiple failed servers without prioritization.
- Silent bit-rot corruption risks if integrity is not verified on transfer.

**SelfHeal Storage** advances the project from **TRL 2 (concept formulation)** to a functional **TRL 4 laboratory prototype**. It demonstrates an autonomous, self-healing storage cluster across simulated rack failure domains with a real-time reactive infrastructure dashboard.

---

## 2. Redesigned User Experience & Clean 6-Item Navigation

To make the system understandable within 5 seconds for faculty and beginner review, the interface has been streamlined into **six core destinations**:

1. **Dashboard (`/`)**:
   - **5-Second Clarity Banner**: *"Your files, protected across multiple storage servers."* with Cluster Status badge.
   - **Three Primary Action Buttons**: *Upload a File*, *View My Files*, *Run Failure Simulation*.
   - **Four Summary Cards**: Storage Servers (e.g. 5 of 6 working), Files Stored, Storage Used, Files Needing Recovery.
   - **Simple System Status Panel**: Plain-English health status with expandable technical details.
   - **Compact Network Overview**: 6 nodes with simple status dots and a button to view the full interactive graph.
   - **Demo Guide (5-Step Tour)**: Interactive step-by-step evaluator walkthrough.

2. **My Files (`/files`)**:
   - Cloud storage interface with file upload dialog (drag-and-drop or browse).
   - Shows Filename, Size, Importance, Available Copies, Protection Status (**Protected**, **Needs Recovery**, **At Risk**), and Actions.
   - File details modal showing exact replica server mappings with expandable SHA-256 and adaptive rule details.

3. **Storage Servers (`/servers`)**:
   - Toggle between **Server Cards View** and the full **Interactive React Flow Network Topology**.
   - Server health badges: **Working** (green), **Slow** (amber), **Offline** (red).
   - On-card failure simulation controls: *+40ms Latency*, *Make Slow*, *Stop Server*, *Restore Server*.
   - Expandable advanced metrics: OLS regression slope, risk score, CPU load, and rack IDs.

4. **Self-Healing (`/self-healing`)**:
   - **Section A**: Server Health list with plain-English rationales.
   - **Section B**: File Recovery table with a prominent **Start Recovery** button.
   - **Section C**: Guided 3-Step Failure Simulator (Select Server $\to$ Select Scenario $\to$ Run Simulation $\to$ Live Event Output).
   - Secondary Tabs: Replication Policies, Priority Queue Urgency, Data Integrity Lab (SHA-256 bit-rot test), and Placement Decisions.

5. **Experiments (`/experiments`)**:
   - Empirical comparison between Baseline Reactive and Proposed Self-Healing DFS.
   - Automated benchmark trials, Recharts latency distributions, and CSV export.

6. **Settings (`/settings`)**:
   - Autonomous health monitoring controls (Pause/Resume loop).
   - Searchable system audit event logs.
   - TRL 2 to TRL 4 feature implementation audit matrix.

```
+---------------------------------------------------------------------------------+
|                              REACT WEB DASHBOARD                                |
|  Overview • Storage Nodes • File Explorer • Replication • Health • Recovery     |
|  Data Integrity • Simulation Lab • Experiments • System Logs • Settings         |
+---------------------------------------------------------------------------------+
                                       │ WebSocket & REST API
                                       ▼
+---------------------------------------------------------------------------------+
|                           FASTAPI BACKEND ORCHESTRATOR                          |
|  - Health Engine (OLS Slope Trend + Heartbeat Fusion)                           |
|  - Adaptive Replication Policy Engine (5 Dynamic Rules)                         |
|  - Placement Optimizer (Normalized Load + Rack/Switch/PDU Diversity)            |
|  - Urgency Priority Queue (Missing Replicas + Criticality + Waiting Bonus)      |
|  - Cryptographic Integrity Validator (SHA-256 Bit-Flip Detection & Repair)      |
+---------------------------------------------------------------------------------+
           │                                                    │
           ▼                                                    ▼
+----------------------+                             +----------------------+
|   DATABASE LAYER     |                             |  LOCAL NODE STORAGE  |
| - MongoDB (port 27017)|                             | storage_data/nodes/  |
| - or Resilient JSON  |                             |  ├── node_1/ (Rack-A)|
|   Fallback Store     |                             |  ├── node_2/ (Rack-A)|
+----------------------+                             |  ├── node_3/ (Rack-A)|
                                                     |  ├── node_4/ (Rack-B)|
                                                     |  ├── node_5/ (Rack-B)|
                                                     |  └── node_6/ (Rack-B)|
                                                     +----------------------+
```

---

## 3. Technologies Used

### Frontend:
- **React 19** with **Vite** (Modern, fast bundler)
- **TypeScript** (Strict type safety)
- **Tailwind CSS v3** (Dark navy infrastructure UI style with cyan/amber/rose accents)
- **Recharts** (Interactive latency, capacity, and benchmark charts)
- **@xyflow/react (React Flow)** (Interactive cluster network topology with failure simulation)
- **Lucide React** (Infrastructure and system icons)
- **React Router DOM v7** (Multi-page persistent left navigation)

### Backend:
- **Python 3.13 / 3.11+**
- **FastAPI** (High-performance async REST framework)
- **Pydantic v2** (Strict data schema modeling)
- **WebSockets** (Real-time telemetry and cluster push events)
- **PyMongo** (MongoDB integration)
- **pytest** (Automated backend unit and integration tests)

---

## 4. Implemented vs. Simulated Features (TRL Assessment)

| Feature | Classification | Description & Validation |
| :--- | :---: | :--- |
| **6-Node Cluster Storage** | **Implemented** | Real separate storage directories per logical node with rack-aware assignment. |
| **SHA-256 Checksumming** | **Implemented** | Cryptographic verification calculated on upload/download; bit-flip self-healing. |
| **Adaptive Replication** | **Implemented** | Dynamic rule evaluation based on importance, access frequency, and dormancy. |
| **Predictive Health Monitoring** | **Implemented** | Ordinary Least Squares (OLS) response-time regression slope calculation. |
| **Diversity & Load Placement** | **Implemented** | Rack, switch, and power domain diversity combined with CPU/IO/Disk scoring. |
| **Priority Recovery Queue** | **Implemented** | Urgency ranking prioritizing missing count, criticality, and wait time bonus. |
| **Dual Write Pipeline** | **Implemented** | Parallel Push (concurrent) vs Daisy-Chain Pipeline with live timing comparison. |
| **Simulation Lab (A-F)** | **Implemented** | Real backend fault injections (latency bumps, fail-stop crashes, bit corruption). |
| **Comparative Experiments** | **Implemented** | Controlled trial runner measuring actual detection times, latencies, and CSV export. |
| **Physical Multi-Server Racks** | **Simulated** | Logical nodes running as separate directories on a single host. |

---

## 5. Algorithms and Mathematical Formulations

### A. Predictive Health Monitoring & Linear Regression Slope
Response times are collected over a sliding window of $N=10$ samples taken at intervals of $\Delta t = 3.0$ seconds ($x_i = i \times \Delta t$).

The slope $m$ in milliseconds per second is calculated via OLS linear regression:
$$m = \frac{N \sum_{i=0}^{N-1} (x_i y_i) - \sum_{i=0}^{N-1} x_i \sum_{i=0}^{N-1} y_i}{N \sum_{i=0}^{N-1} x_i^2 - \left(\sum_{i=0}^{N-1} x_i\right)^2}$$

Normalized slope and missed heartbeats:
$$\text{slope\_norm} = \text{clamp}\left(\frac{m}{m_{\text{ref}}}, 0, 1\right), \quad \text{hb\_norm} = \text{clamp}\left(\frac{\text{missed}}{\text{hb\_max}}, 0, 1\right)$$

Combined Risk Score:
$$\text{Risk Score} = \beta \cdot \text{slope\_norm} + (1 - \beta) \cdot \text{hb\_norm}$$
*(Default: $\beta = 0.60$, $m_{\text{ref}} = 8.0 \text{ ms/s}$, $\text{hb\_max} = 4$)*

**State Transitions:**
- **NORMAL**: $\text{Risk} < 0.35$
- **AT-RISK**: $0.35 \le \text{Risk} < 0.70$
- **FAIL-STOP**: $\text{Risk} \ge 0.70$ or $\text{missed} \ge 4$

---

### B. Adaptive Replication Policy Engine
Files are tagged as **Standard** or **Critical**.

1. **Rule 1 (Standard Normal)**: Access rate $< 2.0 \text{ req/min} \implies \text{Target} = 3$
2. **Rule 2 (Standard Dormant)**: Inactive $> 120 \text{s} \implies \text{Target} = 2$
3. **Rule 3 (Standard High Access)**: Access rate $\ge 2.0 \text{ req/min} \implies \text{Target} = 4$
4. **Rule 4 (Critical Normal)**: High availability baseline $\implies \text{Target} = 4$
5. **Rule 5 (Critical High Access)**: Hot critical data $\implies \text{Target} = 5$

---

### C. Load- and Diversity-Aware Placement
Filters out failed nodes, at-risk nodes, nodes holding existing replicas, and nodes lacking capacity.

Normalized Load:
$$L = w_{\text{cpu}} \cdot \frac{\text{CPU}}{100} + w_{\text{io}} \cdot \frac{\text{IO}}{100} + w_{\text{storage}} \cdot \frac{\text{Used}}{\text{Capacity}}$$

Failure-Domain Diversity Score $D$:
- $+0.50$ if candidate resides in a different rack from all existing replica nodes
- $+0.30$ if candidate is connected to a different network switch
- $+0.20$ if candidate is on a different power distribution unit (PDU)

Placement Fitness Score:
$$\text{Placement Score} = w_{\text{load}} \cdot (1 - L) + w_{\text{div}} \cdot D$$

---

### D. Priority Recovery Queue Urgency
Recovery jobs in the queue are sorted descending by calculated urgency:
$$\text{Urgency} = 1000 \cdot \text{Missing\_Replicas} + 10 \cdot \text{Criticality\_Weight} + \min(\text{Wait\_Seconds} \times 0.5, 50.0)$$
*(where $\text{Criticality\_Weight} = 2.0$ for Critical, $1.0$ for Standard)*

---

## 6. Database Collections

When running with MongoDB, the database `selfheal_storage` maintains:
1. `nodes`: Node configurations, hardware metrics, response time history, slopes, and risk scores.
2. `files`: File metadata, target factors, surviving counts, and authoritative SHA-256 hashes.
3. `replicas`: Node mappings, primary flag, integrity flag, and replica creation timestamps.
4. `recovery_jobs`: Queued, in-progress, completed, and failed recovery task records with urgency scores.
5. `system_events`: Auditable logs of all cluster events, status transitions, and self-healing actions.
6. `simulations`: Scenario statuses and timeline event steps.
7. `experiments`: Empirical benchmark results comparing baseline vs proposed self-healing.

---

## 7. API Endpoints

### Health & Cluster
- `GET /api/health` — Checks backend and database persistence status
- `GET /api/cluster/overview` — Retrieves cluster health, metric counters, and capacity utilization
- `POST /api/cluster/monitoring/toggle` — Pauses or resumes background heartbeat monitor
- `POST /api/cluster/reset` — Restores all 6 nodes to healthy baseline

### Storage Nodes
- `GET /api/nodes` — Lists all 6 nodes across Rack-A & Rack-B
- `GET /api/nodes/{node_id}` — Gets detailed node metrics and response time history
- `POST /api/nodes/{node_id}/simulate-latency` — Injects artificial latency (+30ms, +75ms)
- `POST /api/nodes/{node_id}/simulate-failure` — Marks node as FAIL-STOP
- `POST /api/nodes/{node_id}/restore` — Restores node to NORMAL operating state
- `GET /api/nodes/{node_id}/replicas` — Lists all replicas currently placed on this node

### Files & Integrity
- `GET /api/files` — Lists all stored files and surviving replica counts
- `POST /api/files/upload` — Uploads file with importance tag and write mode
- `GET /api/files/{file_id}` — Retrieves file metadata
- `GET /api/files/{file_id}/download` — Downloads file with checksum verification
- `DELETE /api/files/{file_id}` — Deletes file and all replica instances safely
- `POST /api/replication/recalculate` — Recalculates adaptive replication factor
- `GET /api/replication/policies` — Lists adaptive replication policy rules
- `POST /api/integrity/simulate-corruption/{file_id}` — Injects bit-flip into replica on disk
- `POST /api/integrity/verify/{file_id}` — Cryptographically verifies and self-heals corrupted replicas

### Recovery
- `GET /api/recovery/jobs` — Retrieves queued and completed recovery jobs
- `POST /api/recovery/jobs` — Scans cluster and queues under-replicated files
- `POST /api/recovery/run` — Executes priority queue self-healing
- `POST /api/recovery/jobs/{job_id}/retry` — Retries failed recovery job
- `GET /api/recovery/history` — Retrieves audit log of completed recovery jobs

### Simulation & Experiments
- `GET /api/simulations` — Gets active scenario status and event timeline
- `POST /api/simulations/start` — Starts Scenarios A, B, C, D, E, or F
- `POST /api/simulations/reset` — Clears simulation faults
- `POST /api/simulations/seed-demo` — Seeds 4 demo files
- `GET /api/experiments` — Lists empirical benchmark trials
- `POST /api/experiments/run` — Executes comparative benchmark workload
- `GET /api/experiments/{id}/export` — Exports benchmark results as CSV
- `GET /api/logs` — Retrieves searchable system audit log
- `GET /api/project/status` — Retrieves TRL status and algorithm audit matrix

---

## 8. Installation Steps (Windows)

### Prerequisites:
- Python 3.11+ or Python 3.13 (available via `py`)
- Node.js v18+ and npm
- (Optional) Docker Desktop if you wish to run MongoDB in Docker

### Step 1: Install Backend Dependencies
```powershell
py -m pip install fastapi uvicorn pydantic pymongo python-multipart pytest httpx websockets
```

### Step 2: Install Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

---

## 9. Starting the Application

### Option A: One-Command Launcher (Recommended)
From the project root, run:
```powershell
py run_system.py
```
*Or double-click `start.bat`.*
This starts:
- **Backend API**: `http://localhost:8000` (Swagger docs at `/docs`)
- **Frontend Dashboard**: `http://localhost:5173`

### Option B: Starting Services Manually

**Terminal 1 (Backend):**
```powershell
$env:PYTHONPATH="backend"
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 10. Running Automated Tests

Run the backend test suite:
```powershell
$env:PYTHONPATH="backend"
py -m pytest backend/tests -v
```

All 9 test suites verify:
- Linear regression slope calculation accuracy
- Health evaluation and risk score threshold transitions
- All 5 adaptive replication rule conditions
- Load and rack diversity placement scoring
- Priority recovery queue urgency sorting
- File upload and multi-node replica persistence
- Corruption detection and self-healing repair
- Node failure recovery scheduling
- Safe file deletion

---

## 11. Faculty Demonstration Guide (Failure Scenarios)

Navigate to the **Simulation Lab** page (`/simulation`) to present:

1. **Scenario A (Normal Baseline)**: Click **Launch Scenario** to reset all 6 nodes across Rack-A and Rack-B to normal 15-20ms latencies with balanced replicas.
2. **Scenario B (Slow Node & Predictive Relocation)**: Observe progressive latency injection on Node 2. The slope becomes positive, risk score climbs past 0.35, the node transitions to `AT-RISK`, and proactive self-healing triggers to relocate replicas before the server crashes.
3. **Scenario C (Single Node Failure)**: Fails Node 1 (`FAIL-STOP`). Observe under-replication detection, priority recovery queuing, and restoration onto a surviving healthy node.
4. **Scenario D (Catastrophic Two-Node Rack Outage)**: Fails Node 1 and Node 2 simultaneously in Rack-A. Observe priority queue ordering where files missing 2 copies jump ahead of files missing 1 copy, and Critical files jump ahead of Standard files.
5. **Scenario E (Silent Bit-Rot)**: Injects bit corruption into a stored replica on disk. Demonstrates fallback read and automatic self-healing using verified SHA-256 hash.
6. **Scenario F (Rack Storage Pressure)**: Elevates load on Rack-A above 90%. Watch Load- & Diversity-Aware Placement dynamically steer new uploads to low-load Rack-B nodes.

---

## 12. Running Benchmark Experiments

1. Navigate to **Experiments & Metrics** (`/experiments`).
2. Select workload size (e.g., 4 or 8 files).
3. Click **Run Comparative Trial**.
4. The system executes real, measured trials comparing the **Reactive Baseline** against the **Proposed Self-Healing Prototype**.
5. View the side-by-side metrics table, improvement percentages, and comparative bar charts.
6. Click **Export CSV** to download the results.

---

## 13. Current Limitations & Future Improvements

- **Logical vs. Physical Nodes**: Currently, the 6 storage nodes run as isolated directory instances on the local host filesystem. Future work includes packaging each node into separate Docker containers or Kubernetes pods across physical Raspberry Pi / server clusters.
- **Dynamic Quorum Expansion**: Expanding cluster size dynamically beyond 6 nodes with automated Paxos/Raft leader election.
- **Data Deduplication**: Chunk-level content-addressable deduplication across replicas to optimize disk utilization.

