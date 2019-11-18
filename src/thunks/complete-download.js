import { replaceFileExt } from './helpers';
import { PARTIAL_DOWNLOAD_EXTENSION } from '../constants';
import pify from 'pify';
import path from 'path';
import { completeDownload } from '../actions';
import fs from 'fs';

export default function thunkCompleteDownload(id) {
  return async (dispatch, getState) => {
    const rename = pify(fs.rename, { multiArgs: true });
    const download = getState().downloads.find(download => download.id === id);
    await rename(
      replaceFileExt(
        path.resolve(download.dirname, download.availableFilename),
        PARTIAL_DOWNLOAD_EXTENSION
      ),
      path.resolve(download.dirname, download.availableFilename)
    );
    dispatch(completeDownload(id));
    return Promise.resolve();
  };
}
