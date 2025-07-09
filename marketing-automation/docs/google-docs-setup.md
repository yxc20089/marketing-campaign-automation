# Google Docs Integration Setup Guide

This guide explains how to configure Google Docs integration for the Marketing Automation System.

## Overview

The Google Docs integration allows the system to automatically save all generated content as structured documents in Google Drive. This provides:

- **Automatic backup** of all generated content
- **Collaboration capabilities** for team reviews
- **Structured formatting** with metadata
- **Organized storage** in specified folders

## Prerequisites

- Google Cloud Platform account
- Google Drive access
- Basic understanding of service accounts

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" or select an existing project
3. Enter a project name (e.g., "Marketing Automation")
4. Click "Create"

## Step 2: Enable Required APIs

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - **Google Docs API**
   - **Google Drive API**

## Step 3: Create a Service Account

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - **Name**: `marketing-automation-service`
   - **Description**: `Service account for marketing automation system`
4. Click "Create and Continue"
5. Skip the role assignment (optional) and click "Continue"
6. Click "Done"

## Step 4: Generate Service Account Key

1. In the "Credentials" page, find your service account
2. Click on the service account name
3. Navigate to the "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Select "JSON" format
6. Click "Create"
7. The JSON file will be downloaded to your computer

## Step 5: Configure the Marketing Automation System

1. **Save the credentials file**:
   - Move the downloaded JSON file to your project directory
   - Rename it to something like `google-service-account.json`
   - Example path: `/Users/yourname/marketing-automation/google-service-account.json`

2. **Update the configuration**:
   - In the system configuration, enter the full path to your JSON file
   - Example: `/Users/yourname/marketing-automation/google-service-account.json`

## Step 6: Create a Drive Folder (Optional)

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder for your marketing content (e.g., "Marketing Automation Content")
3. Right-click the folder and select "Share"
4. Add your service account email (found in the JSON file) with "Editor" permissions
5. Copy the folder ID from the URL:
   - URL: `https://drive.google.com/drive/folders/1ABC123xyz...`
   - Folder ID: `1ABC123xyz...`
6. Enter this folder ID in the system configuration

## Step 7: Test the Integration

1. In the marketing automation system, go to Configuration
2. Enter your Google Docs credentials file path
3. Optionally enter your Google Drive folder ID
4. Click "Test Configuration" to verify the setup
5. Generate some test content to verify documents are created successfully

## Troubleshooting

### Common Issues

1. **"Credentials file not found"**
   - Verify the file path is correct
   - Use absolute path, not relative path
   - Ensure the file has proper read permissions

2. **"Access denied" errors**
   - Check that the service account has access to the Drive folder
   - Verify the APIs are enabled in Google Cloud Console
   - Ensure the service account key is valid

3. **"Cannot create documents"**
   - Verify Google Docs API is enabled
   - Check service account permissions
   - Ensure the folder ID is correct (if specified)

### Security Best Practices

1. **Store credentials securely**
   - Don't commit the JSON file to version control
   - Use environment variables in production
   - Restrict service account permissions

2. **Monitor usage**
   - Check Google Cloud Console for API usage
   - Set up billing alerts if needed
   - Monitor document creation in Drive

## Document Structure

The system creates documents with the following structure:

```
Title: [Platform] - [Content Title] (Date)

Platform: WECHAT/XHS/GOOGLEDOCS
Topic: [Original Topic]
Generated: [ISO Timestamp]

--- CONTENT ---

[Main content body]

Hashtags: [If applicable]
```

## Advanced Configuration

### Custom Folder Organization

You can organize documents by:
- Creating separate folders for different platforms
- Using date-based folder structures
- Implementing topic-based organization

### Collaboration Features

- Share folders with team members
- Set up notification rules
- Use Google Drive's commenting system for feedback

### Backup and Archive

- Set up automatic backup of important documents
- Create archive folders for historical content
- Implement retention policies

## API Limits and Quotas

Google APIs have usage limits:
- **Google Docs API**: 100 requests per 100 seconds per user
- **Google Drive API**: 1,000 requests per 100 seconds per user

The system is designed to operate well within these limits for normal usage.

## Cost Considerations

- Google Docs API usage is **free** for most use cases
- Google Drive storage may have costs for large volumes
- Monitor usage in Google Cloud Console

## Support

For issues with Google Cloud setup:
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Google Workspace API Documentation](https://developers.google.com/workspace)

For system-specific issues:
- Check the system logs for detailed error messages
- Verify all configuration settings
- Test with a simple document creation first