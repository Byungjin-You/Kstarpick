# K-pop News Portal Deployment Guide

This guide will help you deploy your K-pop News Portal application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A MongoDB Atlas account for the production database
3. Git installed on your machine

## Step 1: Set up MongoDB Atlas

1. Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster (the free tier is sufficient to start)
3. Set up database access:
   - Create a new database user with a strong password
   - Make sure to give this user read and write permissions
4. Set up network access:
   - Add `0.0.0.0/0` to the IP access list to allow access from anywhere (for Vercel)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string, which looks like:
     `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/kpop-news-portal`
   - Replace `<username>` and `<password>` with your database user credentials

## Step 2: Prepare Your Application

1. Make sure your code is committed to a Git repository (GitHub, GitLab, or Bitbucket)
2. Update the `.env.production` file with your MongoDB Atlas connection string
3. Make sure your package.json has the following scripts:
   ```json
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start"
   }
   ```

## Step 3: Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended for First-Time Setup)

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Configure the project:
   - Set the Framework Preset to "Next.js"
   - Add the environment variables from your `.env.production` file:
     - MONGODB_URI
     - NEXTAUTH_SECRET
     - JWT_SECRET
     - ADMIN_KEY
   - Leave NEXTAUTH_URL blank; Vercel will set it automatically
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Log in to Vercel:
   ```bash
   vercel login
   ```
3. Deploy your project:
   ```bash
   vercel
   ```
4. Follow the prompts and make sure to set the environment variables when asked

## Step 4: Set Up Environment Variables

After your first deployment, you should set up your environment variables in the Vercel Dashboard:

1. Go to your project in the Vercel Dashboard
2. Click on "Settings" > "Environment Variables"
3. Add the following variables:
   - MONGODB_URI (your MongoDB Atlas connection string)
   - NEXTAUTH_SECRET (a secure random string)
   - JWT_SECRET (a secure random string)
   - ADMIN_KEY (your admin registration key)
4. Click "Save"
5. Redeploy your application for the changes to take effect

## Step 5: Custom Domain (Optional)

1. In your Vercel Dashboard, go to your project
2. Click on "Settings" > "Domains"
3. Add your custom domain and follow the instructions to set up DNS

## Troubleshooting

- **Database Connection Issues**: Make sure your MongoDB Atlas network access allows connections from anywhere (0.0.0.0/0)
- **Authentication Problems**: Verify that your NEXTAUTH_SECRET and JWT_SECRET are properly set
- **Build Failures**: Check the build logs in Vercel for specific errors

## Maintaining Your Deployment

1. **Updates**: Pushing changes to your Git repository will trigger a new deployment
2. **Monitoring**: Use the Vercel Dashboard to monitor your application's performance
3. **Scaling**: As your traffic grows, you may need to upgrade your MongoDB Atlas plan

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment) 