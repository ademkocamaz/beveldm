import React, { createRef } from 'react';
import { connect } from 'react-redux';
import request from 'request';
import { addNewDownload } from '../actions';

function AddNewDownload({ onAdd = () => { } }) {
  const url = createRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(url.current.value);
    url.current.value = null;
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input name="url" type="text" placeholder="Enter url" ref={url} />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}

function getFileName(headers) {
  const regex = /filename=(.+)/i;
  const MATCH_INDEX = 1;
  const matchArray = headers['content-disposition'].match(regex);
  return matchArray[MATCH_INDEX];
}

function getFileSize(headers) {
  return parseInt(headers['content-length']);
}

export default connect(
  null,
  dispatch => ({
    onAdd: url => {
      request.get(url)
        .on('response', res => {
          dispatch(
            addNewDownload(
              url,
              getFileName(res.headers),
              getFileSize(res.headers)
            )
          );
        });
    }
  })
)(AddNewDownload);
