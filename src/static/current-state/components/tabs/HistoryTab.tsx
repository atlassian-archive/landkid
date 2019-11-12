import * as React from 'react';
import Pagination from '@atlaskit/pagination';

import { TabContent } from './TabContent';
import { EmptyState } from '../EmptyState';
import { QueueItemJoined } from '../QueueItem';
import { WithAPIData } from '../WithAPIData';
import { Section } from '../Section';

export type HistoryItemsListProps = {
  history: Array<HistoryItem>;
  renderEmpty?: () => JSX.Element;
  bitbucketBaseUrl: string;
  items: number;
  pageLen: number;
  onPageChange: (page: number) => void;
};

export type HistoryTabProps = {
  bitbucketBaseUrl: string;
};

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
        renderLoading={() => <Section>Loading...</Section>}
        endpoint={`api/history?page=${this.state.page}`}
        render={historyResponse => {
          const { history, pageLen, count } = historyResponse;
          if (!history.length) {
            return (
              <TabContent>
                <EmptyState>Empty...</EmptyState>
              </TabContent>
            );
          }

          const pages = Math.floor(count / pageLen);

          return (
            <div>
              {history.map(item => (
                <QueueItemJoined
                  bitbucketBaseUrl={this.props.bitbucketBaseUrl}
                  request={item.request}
                  status={item.statusEvents.find(status => status.isLatest) || null}
                  key={item.request.id}
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
