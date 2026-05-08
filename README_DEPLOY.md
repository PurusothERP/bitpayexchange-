# 🚀 Deployment Guide: Render (Free Tier)

This project is now fully compatible with Render's free tier. Follow these steps to launch your institutional exchange and yield tracking platform.

## 1. Database Setup (Supabase)
Since Render's free tier does not have persistent storage for SQLite, you must use a remote PostgreSQL database.
1.  Go to [Supabase](https://supabase.com/) and create a free project.
2.  In your Supabase project, go to **Project Settings** > **Database**.
3.  Copy the **Connection String** (URI format). It looks like: `postgresql://postgres:[password]@db.[id].supabase.co:5432/postgres`

## 2. Deploying to Render
We have included a `render.yaml` blueprint to automate the setup.
1.  Push the latest code to your GitHub repository.
2.  Log in to [Render](https://render.com/).
3.  Click **New +** > **Blueprint**.
4.  Connect your GitHub repository: `NilanRitvik/CRYPTO-MEXAPAY`.
5.  Render will automatically detect the services.
6.  **Environment Variables**:
    *   For the `b20-backend` service, paste your Supabase connection string into the `DATABASE_URL` field.
    *   The frontend will automatically link to the backend URL.
7.  Click **Apply**.

## 3. Post-Deployment
*   Once deployed, the backend will automatically synchronize the database schema on Supabase.
*   Your Yield tracking, Admin ledger, and User profiles will now persist forever, even when the free server restarts.

## 🔧 Technical Details (Render Compatibility)
*   **Database**: Dual-mode (SQLite local / PostgreSQL production).
*   **Process Management**: Node.js `PORT` injection for Render compatibility.
*   **Sync Stability**: Configured `nodemon` to ignore background data writes, preventing server restart loops.
*   **Frontend Routing**: Automated `API_URL` discovery using Render internal networking.
