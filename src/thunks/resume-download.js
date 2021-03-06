import {
  changeDownloadInfo,
  setDownloadRes,
  downloadProgressing,
  updateBytesDownloadedShown,
} from '../actions';
import {
  getAvailableFilename,
  getPartialDownloadPath,
  deleteFile,
  getFilename,
  getFileSize,
} from '../utilities';
import downloadFile from './download-file';
import makePartialRequest, {
  makePartialYouTubeRequest,
} from './make-partial-request';
import updateBytesDownloadedThunk from './update-bytes-downloaded';
import downloadErrorThunk from './download-error';

export default function resumeDownload(id) {
  return async (dispatch, getState) => {
    let download = getState().downloads.byId[id];

    if (download.res) {
      dispatch(downloadProgressing(id));
      download.res.resume();
    } else if (download.status === 'error') {
      dispatch(resumeFromError(id, download.error.code));
    } else {
      dispatch(downloadProgressing(id));
      let res;
      if (download.type === 'file') {
        res = await dispatch(
          makePartialRequest({
            id,
            url: download.url,
            rangeStart: download.bytesDownloaded,
          })
        );
      } else if (download.type === 'youtube') {
        res = await dispatch(
          makePartialYouTubeRequest({
            id,
            url: download.url,
            rangeStart: download.bytesDownloaded,
          })
        );
      }

      download = getState().downloads.byId[id];
      if (download.status !== 'progressing') return;

      const filename = getFilename(download.url, res.headers);
      const contentLength = getFileSize(res.headers);
      const size = download.resumable
        ? download.bytesDownloaded + contentLength
        : contentLength;
      if (download.defaultFilename !== filename || download.size !== size) {
        dispatch(downloadErrorThunk(id, 'EFILECHANGED'));
      } else {
        dispatch(setDownloadRes(id, res));
        if (!download.resumable) dispatch(updateBytesDownloadedThunk(id, 0));
        dispatch(downloadFile(id, res));
      }
    }
  };
}

function resumeFromError(id, code) {
  return async (dispatch, getState) => {
    dispatch(downloadProgressing(id));

    let state = getState();
    let download = state.downloads.byId[id];

    switch (code) {
      case 'EFILECHANGED':
      case 'HPE_INVALID_CONTENT_LENGTH':
        const fullpath = getPartialDownloadPath(download);
        deleteFile(fullpath);

        const res = await new dispatch(makePartialRequest(id, download.url, 0));

        state = getState();
        download = state.downloads.byId[id];
        if (download.status !== 'progressing') return;

        dispatch(setDownloadRes(id, res));
        const filename = getFilename(download.url, res.headers);
        const size = getFileSize(res.headers);
        const availableFilename =
          download.defaultFilename === filename
            ? download.availableFilename
            : await getAvailableFilename(
                download.dirname,
                filename,
                state.downloads
              );
        const resumable = res.statusCode === 206;
        dispatch(
          changeDownloadInfo({
            id,
            filename,
            availableFilename,
            size,
            resumable,
          })
        );
        dispatch(updateBytesDownloadedThunk(id, 0));
        dispatch(updateBytesDownloadedShown(id, 0));
        dispatch(downloadFile(id, res));
        break;
      case 'ECONNRESET':
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
        dispatch(resumeDownload(id));
        return;
      default:
        break;
    }
  };
}
