import crypto from "node:crypto";
import { S3Client, DeleteObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";

const formats = {
  "image/jpeg": { kind: "IMAGE", ext: "jpg", max: 10 * 1024 * 1024 },
  "image/png": { kind: "IMAGE", ext: "png", max: 10 * 1024 * 1024 },
  "image/webp": { kind: "IMAGE", ext: "webp", max: 10 * 1024 * 1024 },
  "video/mp4": { kind: "VIDEO", ext: "mp4", max: 100 * 1024 * 1024 },
  "video/webm": { kind: "VIDEO", ext: "webm", max: 100 * 1024 * 1024 },
};

function storage() {
  const { MEDIA_S3_ENDPOINT: endpoint, MEDIA_S3_BUCKET: bucket, MEDIA_S3_REGION: region = "auto", MEDIA_S3_ACCESS_KEY_ID: accessKeyId, MEDIA_S3_SECRET_ACCESS_KEY: secretAccessKey, MEDIA_PUBLIC_BASE_URL: publicBase } = process.env;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicBase) throw new HttpError(503, "Kho ảnh/video chưa được cấu hình.", undefined, "MEDIA_NOT_CONFIGURED");
  let base;
  try {
    const endpointUrl = new URL(endpoint);
    base = new URL(publicBase);
    if (endpointUrl.protocol !== "https:" || base.protocol !== "https:" || endpointUrl.username || base.username || base.search || base.hash) throw new Error("invalid URL");
  } catch { throw new HttpError(503, "Cấu hình kho ảnh/video không hợp lệ.", undefined, "MEDIA_NOT_CONFIGURED"); }
  return { client: new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true }), bucket, base };
}

export function publicMediaUrl(base, key) {
  return `${base.toString().replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function formatFor(contentType, size) {
  const format = formats[contentType];
  if (!format || !Number.isSafeInteger(size) || size < 1 || size > format.max) throw new HttpError(400, "Định dạng hoặc dung lượng ảnh/video không hợp lệ.", undefined, "MEDIA_INVALID_FILE");
  return format;
}

export async function requestResourceMediaUpload(resourceId, { contentType, size }) {
  const format = formatFor(contentType, size);
  const { client, bucket } = storage();
  const key = `resources/${resourceId}/${crypto.randomUUID()}.${format.ext}`;
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 600 });
  return { key, uploadUrl, contentType, maxBytes: format.max, expiresInSeconds: 600 };
}

export async function finishResourceMediaUpload(resourceId, data) {
  const { client, bucket, base } = storage();
  if (!new RegExp(`^resources/${resourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[a-f0-9-]{36}\\.(jpg|png|webp|mp4|webm)$`).test(data.key)) throw new HttpError(400, "Khóa tệp không hợp lệ.", undefined, "MEDIA_INVALID_KEY");
  let head;
  try { head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: data.key })); }
  catch { throw new HttpError(409, "Không tìm thấy tệp đã tải lên kho media.", undefined, "MEDIA_UPLOAD_MISSING"); }
  const format = formatFor(head.ContentType, Number(head.ContentLength));
  if (format.kind !== data.kind) throw new HttpError(400, "Loại media không khớp tệp đã tải.", undefined, "MEDIA_INVALID_FILE");
  const row = await prisma.resourceMedia.create({ data: { id: crypto.randomUUID(), resourceId, kind: data.kind, url: publicMediaUrl(base, data.key), objectKey: data.key, title: data.title, altText: data.altText, credit: data.credit || null, license: data.license || null, sortOrder: data.sortOrder } });
  return row;
}

export async function addExternalResourceMedia(resourceId, data) {
  let url, sourceUrl;
  try {
    url = new URL(data.url);
    sourceUrl = new URL(data.sourceUrl);
    const allowed = (process.env.MEDIA_EXTERNAL_HOSTS || "upload.wikimedia.org,commons.wikimedia.org").split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
    if (url.protocol !== "https:" || url.username || url.password || !allowed.includes(url.hostname.toLowerCase()) || sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password) throw new Error("invalid URL");
  } catch { throw new HttpError(400, "Media phải dùng HTTPS từ nguồn được cho phép, kèm trang nguồn.", undefined, "MEDIA_INVALID_URL"); }
  return prisma.resourceMedia.create({ data: { id: crypto.randomUUID(), resourceId, kind: data.kind, url: url.toString(), title: data.title, altText: data.altText, sourceUrl: sourceUrl.toString(), credit: data.credit, license: data.license, sortOrder: data.sortOrder } });
}

export async function deleteResourceMedia(resourceId, mediaId) {
  const media = await prisma.resourceMedia.findFirst({ where: { id: mediaId, resourceId } });
  if (!media) throw new HttpError(404, "Không tìm thấy media.", undefined, "NOT_FOUND");
  await prisma.resourceMedia.delete({ where: { id: media.id } });
  if (media.objectKey) {
    try {
      const { client, bucket } = storage();
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: media.objectKey }));
    } catch (error) {
      // DB ownership is already removed; bucket cleanup can be retried out of band.
    }
  }
}
