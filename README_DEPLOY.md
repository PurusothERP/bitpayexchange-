# 🚀 Deployment Guide: Render (SQLite Mode)

You have chosen to use **SQLite** as your primary database. To ensure your investment data is not lost on every restart, you **must** use a Render Persistent Disk.

## ⚠️ IMPORTANT: Cost Note
Render's **Free Tier** does not support persistent disks. To use SQLite safely on Render:
1.  The Backend must be on the **Starter Plan** ($7/month).
2.  The Disk costs approximately **$0.25/GB per month**.

If you want a **100% FREE** option, you must use **PostgreSQL** (see the previous version of this project or use Supabase).

## Deployment Steps

### 1. Deploying to Render
We have included a `render.yaml` blueprint configured for SQLite with persistent storage.
1.  Push the latest code to your GitHub repository.
2.  Log in to [Render](https://render.com/).
3.  Click **New +** > **Blueprint**.
4.  Connect your GitHub repository.
5.  Render will detect the `b20-backend` (Starter) and `b20-frontend` (Free) services.
6.  **Disk Setup**: Render will automatically create a 1GB disk and mount it at `/var/lib/b20-data`.
7.  **Environment Variables**:
    *   `SQLITE_PATH` is automatically set to `/var/lib/b20-data/database.sqlite`.
    *   `BSC_RPC_URL` and `FACTORY_ADDRESS` are pre-configured.

### 2. Verify Persistence
*   Once deployed, perform a test investment.
*   Restart the service in the Render dashboard.
*   If the investment details are still there after the restart, your **Persistent Disk** is working correctly.

## 🔧 Technical Details
*   **Database Path**: The app is configured to prioritize `process.env.SQLITE_PATH`.
*   **Auto-Initialization**: The backend will automatically create the database file and all required tables in the persistent folder upon first launch.
