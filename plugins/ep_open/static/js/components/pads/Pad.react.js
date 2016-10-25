import window from 'global';
import React, { Component } from 'react';
import classNames from 'classnames';
import { branch } from 'baobab-react/decorators';
import { Link } from 'react-router';
import DocumentTitle from 'react-document-title';
import { niceDate } from '../../utils/helpers';
import Base from '../Base.react';
import * as actions from '../../actions/pads';

@branch({
    cursors: {
        currentPad: ['currentPad'],
        pads: ['pads']
    },
	actions
})
export default class Pad extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

	constructor(props) {
		super(props);

        const currentTab = props.params.padId;

        this.tabs = (props.location.query.tabs || currentTab).split(',');
        props.actions.fetchPadsByIds(this.tabs);

		props.actions.setCurrentPad(currentTab);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.location.query.tabs !== this.props.location.query.tabs) {
            this.tabs = (nextProps.location.query.tabs || nextProps.params.padId).split(',');
            this.props.actions.fetchPadsByIds(this.tabs);
        }

        if (nextProps.params.padId !== this.props.params.padId) {
            this.props.actions.setCurrentPad(nextProps.params.padId);
        }
    }

    goToTab(id) {
        const query = this.tabs.length > 1 ? `?tabs=${this.tabs.join(',')}` : '';

        this.context.router.push(`/pads/${id}${query}`);
    }

    buildTabs() {
        const padsObject = {};

        this.props.pads.forEach(pad => padsObject[pad.id] = pad);

        return this.tabs.map(tab => padsObject[tab]).map(pad => (
            <div
                key={pad.id}
                className={classNames('pad__tab', {
                    'pad__tab--active': pad.id === this.props.currentPad.id
                })}
                onClick={this.goToTab.bind(this, pad.id)}>{pad.title}</div>
        ));
    }

	render() {
        const { currentPad } = this.props;

        if (!currentPad.id) {
            return null;
        }

		return (
            <DocumentTitle title={currentPad.title + ' | Open Companies'}>
                <div className='pad'>
                    <div className='pad__tabs'>
                        <div className='pad__tabs_scrollbox'>
                            {this.buildTabs()}
                        </div>
                    </div>
                    <div className="pad__iframe" ref="iframe"></div>
                </div>
            </DocumentTitle>
		);
	}

    componentDidUpdate() {
        const etherpadId = this.props.currentPad && this.props.currentPad.etherpadId;

        if (etherpadId && etherpadId !== this.currentIframeId && this.refs.iframe) {
            const currentIframe = this.currentIframeId && document.getElementById(this.currentIframeId);
            let iframe = document.getElementById(etherpadId);

            if (iframe) {
                iframe.className = '';
            } else {
                iframe = document.createElement('iframe');
                iframe.id = etherpadId;
                iframe.src = `/p/${etherpadId}?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false`;
                this.refs.iframe.appendChild(iframe);
            }

            if (currentIframe) {
                currentIframe.className = 'hidden';
            }

            this.currentIframeId = etherpadId;
        }
    }
}