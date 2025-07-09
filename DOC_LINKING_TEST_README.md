# Document Linking Test

This directory contains scripts to test the document linking functionality in the SEO Timeline application.

## Test Scripts

1. `test-doc-linking.js` - The main Node.js test script that:
   - Logs in via API and stores cookies
   - Fetches projects, tasks, and documents
   - Links a document to a task
   - Verifies the document was linked correctly

## Running the Tests

### Within Docker Environment

To run the tests inside the Docker container (recommended for accurate environment):

```bash
# Using bash script
./run-doc-linking-test.sh

# Using npm script
npm run test:docker --prefix ./

# Using Windows batch file
run-doc-linking-test.bat
```

### From Host Machine

To run the tests from your host machine (accessing the API through localhost):

```bash
# Using bash script
./run-doc-linking-test-local.sh

# Using npm script
npm run test:local --prefix ./

# Using Windows batch file
run-doc-linking-test-local.bat
```

## Expected Output

If the test is successful, you should see output similar to:

```
Login successful!
Projects: [...]
Tasks: [...]
Documents: [...]
Linking document [ID] to task [ID]...
Document linked: [...]
Link created successfully!
Linked documents: [...]
Verification successful! Found linked documents.
```

## Troubleshooting

1. If login fails:
   - Verify the email/password in the script
   - Check the Docker containers are running (`docker-compose ps`)
   - Check server logs (`docker-compose logs app`)

2. If no projects/tasks/documents are found:
   - Make sure the database is seeded with data
   - Check server logs for any database connection issues

3. If document linking fails:
   - Check server logs for permission issues
   - Verify the API endpoints are working correctly
   - Ensure user has sufficient permissions

## Running Frontend Tests

After confirming the API functionality works, test the UI components:

1. Log in to the application at http://localhost:5000
2. Navigate to a project with tasks
3. Open a task detail view
4. Use the "Link Document" button to link a document
5. Verify the document appears in the task's document list
