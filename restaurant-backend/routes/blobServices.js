// backend/routes/blobServices.js
const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential
} = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
const { parseConnectionString } = require("@azure/core-auth");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "menu-images";

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING in environment");
}

// --- extract account name and key manually ---
function getAccountInfoFromConnectionString(connectionString) {
  const accountName = connectionString.match(/AccountName=([^;]+)/)[1];
  const accountKey = connectionString.match(/AccountKey=([^;]+)/)[1];
  return { accountName, accountKey };
}

const { accountName, accountKey } = getAccountInfoFromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Ensure container exists (safe to call on startup)
async function ensureContainer() {
  try {
    const exists = await containerClient.exists();
    if (!exists) await containerClient.create();
  } catch (err) {
    console.warn("Could not ensure container exists:", err.message);
  }
}
ensureContainer().catch(() => {});

// Upload a file to blob storage
async function uploadToBlob(file) {
  const blobName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype || "application/octet-stream" },
  });

  return blockBlobClient.url; // we’ll later generate SAS when reading
}

// Delete a blob
async function deleteFromBlob(blobName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    console.log(`Deleted blob ${blobName}`);
  } catch (err) {
    console.warn("deleteFromBlob error:", err.message);
  }
}

// ✅ Generate a SAS URL (readable for 1 hour)
function generateSasUrl(blobName) {
  try {
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn,
      },
      sharedKeyCredential
    ).toString();

    const blobUrl = `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasToken}`;
    return blobUrl;
  } catch (err) {
    console.warn("generateSasUrl failed:", err.message);
    return containerClient.getBlockBlobClient(blobName).url;
  }
}

module.exports = {
  uploadToBlob,
  deleteFromBlob,
  generateSasUrl,
};
