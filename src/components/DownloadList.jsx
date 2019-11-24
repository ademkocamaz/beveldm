import React, { Fragment } from 'react';
import Download from './Download';
import { connect } from 'react-redux';
import { CircularProgress } from '@material-ui/core';

const styles = {
  main: {
    textAlign: 'center'
  },
  list: {
    display: 'inline-block',
    width: '600px',
    textAlign: 'left'
  },
  gettingInfo: {
    marginTop: '15px',
    marginBottom: '15px',
    textAlign: 'center'
  }
};

function DownloadList({ downloads = [] }) {
  return (
    <div style={styles.main}>
      <div style={styles.list}>
        {downloads.map(download => (
          <Fragment key={download.id}>
            {download.status === 'gettinginfo' ? (
              <div style={styles.gettingInfo}>
                <CircularProgress />
              </div>
            ) : (
              <Download {...download} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default connect(state => ({
  downloads: state.downloads
}))(DownloadList);
