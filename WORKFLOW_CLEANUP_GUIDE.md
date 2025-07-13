# GitHub Actions Storage Management Guide

## 🎯 **Immediate Solutions**

### **Option 1: Repository Settings (Easiest)**
1. Go to your repo → **Settings** → **Actions** → **General**
2. Under "Artifact and log retention" set to **7-30 days**
3. This will automatically clean up old runs

### **Option 2: Use the Cleanup Workflows**
I've created 3 cleanup workflows for you:

#### 1. `cleanup-old-workflows.yml` - Simple Weekly Cleanup
- Runs every Sunday at 3 AM
- Keeps last 30 days + minimum 10 runs per workflow
- Also cleans up old artifacts

#### 2. `advanced-cleanup.yml` - Smart Daily Cleanup  
- Runs daily at 2 AM
- Configurable retention (default 30 days)
- Detailed logging and reports

#### 3. `manual-cleanup.yml` - On-Demand Cleanup
- Trigger manually when needed
- Choose cleanup intensity:
  - **Conservative**: 60 days, 15 runs minimum
  - **Moderate**: 30 days, 10 runs minimum  
  - **Aggressive**: 14 days, 5 runs minimum
  - **Emergency**: 7 days, 3 runs minimum

## 🚀 **Quick Start Instructions**

### **For Immediate Cleanup:**
1. Go to your repo → **Actions** tab
2. Find "Manual Cleanup Trigger" workflow
3. Click **"Run workflow"**
4. Choose **"aggressive"** for immediate space savings

### **For Automatic Management:**
- The workflows will run automatically once committed
- Check **Actions** → **"Cleanup Old Workflow Runs"** for weekly cleanup
- Check **Actions** → **"Advanced Workflow Cleanup"** for daily maintenance

## 📊 **Storage Optimization Tips**

### **Reduce Artifact Storage:**
```yaml
# In your existing workflows, add cleanup steps:
- name: 🗑️ Cleanup Build Artifacts
  if: always()
  run: |
    rm -rf node_modules dist coverage
```

### **Optimize Log Output:**
```yaml
# Reduce verbose logging in workflows:
- name: 📥 Install Dependencies
  run: npm ci --silent
```

### **Conditional Workflow Runs:**
```yaml
# Only run full test suite on main branch:
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

## 🎛️ **Recommended Settings**

### **For Active Development:**
- **Retention**: 30 days
- **Minimum runs**: 10 per workflow
- **Cleanup frequency**: Weekly

### **For Production:**
- **Retention**: 60 days  
- **Minimum runs**: 15 per workflow
- **Cleanup frequency**: Daily

### **For Storage Conscious:**
- **Retention**: 14 days
- **Minimum runs**: 5 per workflow
- **Cleanup frequency**: Daily

## 📋 **Next Steps**

1. **Commit these cleanup workflows**
2. **Adjust repository settings** (Settings → Actions → General)
3. **Run manual cleanup** for immediate results
4. **Monitor storage usage** in repository insights

---
**💡 Pro Tip**: Start with "moderate" cleanup and adjust based on your needs!
