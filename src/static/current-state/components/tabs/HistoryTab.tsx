import React from 'react';
import Pagination from '@atlaskit/pagination';

import { TabContent } from './TabContent';
import { EmptyState } from '../EmptyState';
import { QueueItemJoined } from '../QueueItem';
import { WithAPIData } from '../WithAPIData';

// export type HistoryItemsListProps = {
//   history: Array<HistoryItem>;
//   renderEmpty?: () => JSX.Element;
//   bitbucketBaseUrl: string;
//   items: number;
//   pageLen: number;
//   onPageChange: (page: number) => void;
// };

/**
  <HistoryItemsList
    bitbucketBaseUrl={props.bitbucketBaseUrl}
    history={historyResponse.history}
    items={historyResponse.count}
    pageLen={historyResponse.pageLen}
    onPageChange={this.onPageChange}
    renderEmpty={() => (
      <TabContent>
        <EmptyState>History is empty...</EmptyState>
      </TabContent>
    )}
  />
 */

export type HistoryTabProps = {
  bitbucketBaseUrl: string;
  loggedInUser: ISessionUser;
  permissionsMessage: string;
};

type HistoryState = {
  page: number;
};

export class HistoryTab extends React.Component<HistoryTabProps, HistoryState> {
  state = {
    page: 1,
  };

  onPageChange = (page: number) => {
    this.setState({
      page: page,
    });
  };

  render() {
    return (
      <WithAPIData<HistoryResponse>
        poll={false}
        endpoint={`api/history?page=${this.state.page}`}
        render={(historyResponse, refresh) => {
          const { history, pageLen, count } = historyResponse;
          if (history === undefined || !history.length) {
            return (
              <TabContent>
                <EmptyState>
                  {this.props.loggedInUser.permission === 'read'
                    ? this.props.permissionsMessage
                    : 'Empty...'}
                </EmptyState>
              </TabContent>
            );
          }

          const pages = Math.floor(count / pageLen);

          return (
            <div>
              {history.map((item) => (
                <QueueItemJoined
                  bitbucketBaseUrl={this.props.bitbucketBaseUrl}
                  status={item}
                  key={item.request.id}
                  queue={history}
                  refreshData={refresh}
                  allQueueItems={history}
                />
              ))}
              <div style={{ marginTop: '30px' }}>
                <Pagination value={this.state.page} total={pages} onChange={this.onPageChange} />
              </div>
            </div>
          );
        }}
      />
    );
  }
}
