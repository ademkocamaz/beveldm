import updateBytesDownloadedThunk from './update-bytes-downloaded';
import fs from 'fs';
import { getPartialDownloadPath } from '../utilities';
import { SAVE_DATA_LIMIT } from '../constants';
import Timeout from 'await-timeout';

export default function downloadFile(id, res) {
  return async (dispatch, getState) => {
    let state = getState();
    let download = state.downloads.find(download => download.id === id);

    const partialDownloadPath = getPartialDownloadPath(download);
    const fileStream = fs.createWriteStream(partialDownloadPath, {
      flags: 'a'
    });
    const timeout = new Timeout();
    let buffer;
    let hasResEnded = false;

    res.on('data', async chunk => {
      res.pause();

      state = getState();
      download = state.downloads.find(download => download.id === id);
      let saveData = state.settings.saveData;

      buffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;

      if (saveData) {
        const writeSlicedBuffer = async () => {
          await timeout.set(500);

          state = getState();
          download = state.downloads.find(download => download.id === id);

          if (
            download.status === 'paused' ||
            download.status === 'canceled' ||
            download.status === 'complete'
          ) {
            return;
          }

          const chunkToWrite = buffer.slice(0, SAVE_DATA_LIMIT / 2);
          buffer = buffer.slice(SAVE_DATA_LIMIT / 2);
          await writeStreamWritePromise(fileStream, chunkToWrite);
          await dispatch(
            updateBytesDownloadedThunk(
              id,
              download.bytesDownloaded + chunkToWrite.length
            )
          );

          state = getState();
          download = state.downloads.find(download => download.id === id);
          saveData = state.settings.saveData;

          if (download.status !== 'paused' && download.status !== 'canceled') {
            if ((buffer.length > SAVE_DATA_LIMIT && saveData) || hasResEnded) {
              await writeSlicedBuffer();
            } else res.resume();
          }
        };
        await writeSlicedBuffer();
      } else {
        await writeStreamWritePromise(fileStream, buffer);
        await dispatch(
          updateBytesDownloadedThunk(
            id,
            download.bytesDownloaded + buffer.length
          )
        );
        buffer = null;

        if (download.status !== 'paused') res.resume();
      }

      if (hasResEnded) fileStream.close();
    });

    res.on('end', () => {
      hasResEnded = true;
    });
  };
}

function writeStreamWritePromise(writeStream, chunk) {
  return new Promise((resolve, reject) => {
    writeStream.write(chunk, err => {
      if (err) reject(err);
      resolve();
    });
  });
}
