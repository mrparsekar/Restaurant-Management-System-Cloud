// backend/routes/blobServices.js
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

const AZURE_STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT;
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "menu-images";

if (!AZURE_STORAGE_ACCOUNT || !AZURE_STORAGE_ACCOUNT_KEY) {
  throw new Error("Missing Azure storage account credentials in environment");
}

const sharedKeyCredential = new StorageSharedKeyCredential(
  AZURE_STORAGE_ACCOUNT,
  AZURE_STORAGE_ACCOUNT_KEY
);

const blobServiceClient = new BlobServiceClient(
  `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
  sharedKeyCredential
);

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

async function uploadToBlob(file) {
  const blobName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, "-")}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype || "application/octet-stream" },
  });

  // Generate a SAS token for read access (24 hours)
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
    sharedKeyCredential
  ).toString();

  const sasUrl = `${blockBlobClient.url}?${sasToken}`;
  return sasUrl;
}

module.exports = { uploadToBlob };
