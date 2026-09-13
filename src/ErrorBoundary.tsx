import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { err: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error) {
    return { err: err.message || String(err) };
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="min-h-screen bg-paper text-ink p-10 max-w-lg">
        <p className="kicker">SHELFSIGNAL</p>
        <h1 className="font-display text-3xl mt-2">This page broke.</h1>
        <p className="text-mute mt-3 text-sm">{this.state.err}</p>
        <button
          className="btn btn-primary mt-6"
          onClick={() => {
            this.setState({ err: null });
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
