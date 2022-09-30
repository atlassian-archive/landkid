import { act, render, screen } from '@testing-library/react';
import App from '../App';
import { proxyRequest, proxyRequestBare } from '../../utils/RequestProxy';

jest.mock('../../utils/RequestProxy');

describe('App', () => {
  let originalLocation = window.location;

  beforeEach(() => {
    // @ts-ignore
    delete window.location;

    // IntersectionObserver isn't available in test environment
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null,
    });
    window.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  test('renders App component', async () => {
    // @ts-ignore
    window.location = { search: '?state=OPEN' };

    (proxyRequest as jest.Mock).mockResolvedValue({
      canLand: false,
      canLandWhenAble: true,
      errors: ['All tasks must be resolved'],
      warnings: [],
      bannerMessage: null,
    });
    (proxyRequestBare as jest.Mock).mockResolvedValue({});

    act(() => {
      render(<App />);
    });

    expect(await screen.findByText('Not ready to land')).toBeDefined();
    expect(await screen.findByText('All tasks must be resolved')).toBeDefined();
  });
});
