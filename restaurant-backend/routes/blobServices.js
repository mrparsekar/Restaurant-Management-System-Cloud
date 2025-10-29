// backend/routes/blobServices.js
const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "menu-images";

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING in environment");
}

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

async function uploadToBlob(file) {
  // file expected from multer: { originalname, buffer, mimetype }
  const blobName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype || "application/octet-stream" },
  });

  // store the full URL (we'll generate SAS when serving if account is private)
  return blockBlobClient.url;
}

async function deleteFromBlob(blobName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    console.log(`Deleted blob ${blobName}`);
  } catch (err) {
    console.warn("deleteFromBlob error:", err.message);
  }
}

// Generate SAS URL (1 hour) for private containers
function generateSasUrl(blobName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // NOTE: generateBlobSASQueryParameters requires a StorageSharedKeyCredential,
    // which is accessible via blobServiceClient.credential if connection string used.
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn,
      },
      blobServiceClient.credential
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  } catch (err) {
    console.warn("generateSasUrl failed, returning blob url without SAS:", err.message);
    return containerClient.getBlockBlobClient(blobName).url;
  }
}

module.exports = {
  uploadToBlob,
  deleteFromBlob,
  generateSasUrl,
};
