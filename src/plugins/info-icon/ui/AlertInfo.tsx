import * as React from 'react';

type AlertProps = {
  initialValue: Record<string, never>;
  title: string;
  content: string;
  close: () => void;
};

export class AlertInfo extends React.PureComponent<AlertProps, AlertProps> {

  constructor(props: AlertProps) {
    super(props);

    this.state = {
      initialValue: props.initialValue,
      title:props.title,
      content:props.content,
      close:props.close
    };
  }

  render(): React.ReactNode {
    const title = this.props.title || 'Info Plugin Error!';
    const content =
      this.props.content ||
      'Unable to load the info plugin.';
    return (
      <div className="molcit-infoicon-alert">
        <strong>{title}</strong>
        <span>{content}</span>
      </div>
    );
  }
}


