import { promises } from 'fs';
import { createHash } from 'crypto';

export const getFileHash = async (filePath: string) => {
  const fileBuffer = await promises.readFile(filePath);
  const hashSum = createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
};

export const getHash = (jsonString: string) => {
  const hashSum = createHash('sha256');
  hashSum.update(jsonString);
  return hashSum.digest('hex');
};
