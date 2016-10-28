import window, { document } from 'global';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { branch } from 'baobab-react/decorators';
import { Link } from 'react-router';
import Draggable from 'react-draggable';
import Base from '../Base.react';
import Spinner from '../common/Spinner.react';
import * as actions from '../../actions/pads';

@branch({
    cursors: {
        currentPad: ['currentPad'],
        padsHierarchy: ['padsHierarchy']
    },
	actions
})
export default class PadsHierarchy extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    }

	constructor(props) {
		super(props);

        let expandedNodes = {};

        try {
            if (window.sessionStorage.expandedNodes) {
                expandedNodes = JSON.parse(window.sessionStorage.expandedNodes);
            }
        } catch(e) {}

        this.state = {
            isLoading: false,
            isResizing: false,
            expandedNodes: expandedNodes
        };
        this.width = window.sessionStorage.hierarchyPanelWidth || 240;

        if (props.isActive) {
            this.state.isActive = true;
            this.props.actions.fetchHierarchy();
            setTimeout(() => this.updateWidth(this.width));
        }
	}

    componentWillReceiveProps(nextProps) {
        if (nextProps.isActive !== this.props.isActive) {
            this.updateWidth(nextProps.isActive ? this.width : null);
        }

        if (nextProps.isActive && nextProps.isActive !== this.props.isActive && !this.props.padsHierarchy) {
            this.props.actions.fetchHierarchy();
            this.setState({ isLoading: true });
        }

        if (nextProps.padsHierarchy !== this.props.padsHierarchy) {
            this.setState({ isLoading: false });
        }
    }

    goToPad(path) {
        const tabs = path.length > 1 ? `?tabs=${path.join(',')}` : '';

        this.context.router.push(`/pads/${path[path.length - 1]}${tabs}`);
        this.setState({ isActive: false });
    }

    toggleNode(nodeId) {
        const expandedNodes = Object.assign({}, this.state.expandedNodes, {
            [nodeId]: !this.state.expandedNodes[nodeId]
        });

        this.setState({ expandedNodes });
        window.sessionStorage.setItem('expandedNodes', JSON.stringify(expandedNodes));
    }

    updateWidth(value) {
        if (!this.contentElement) {
            this.contentElement = document.body.querySelector('.content');
            this.headerElement = document.body.querySelector('.header');
            this.element = ReactDOM.findDOMNode(this);
        }

        if (value !== null) {
            value += 'px';
        }

        this.contentElement.style.marginLeft = value;
        this.headerElement.style.marginLeft = value;
        this.element.style.width = value;
    }

    buildList(list, path) {
        return (
            <div className='pad__hierarchy__list'>
                {list.map(node => (
                    <div
                        key={node.id}
                        className={classNames('pad__hierarchy__node', {
                            'pad__hierarchy__node--root': path.length === 1,
                            'pad__hierarchy__node--active': this.props.currentPad.id === node.id,
                            'pad__hierarchy__node--expanded': this.state.expandedNodes[node.id],
                            'pad__hierarchy__node--parent': node.children
                        })}>
                        {node.children ? (
                            <div
                                className='pad__hierarchy__node__toggler'
                                onClick={this.toggleNode.bind(this, node.id)}></div>
                        ) : null}
                        <div
                            className='pad__hierarchy__node__title'
                            onClick={this.goToPad.bind(this, path.concat(node.id))}>{node.title}</div>
                        {node.children ? this.buildList(node.children, path.concat(node.id)) : null}
                    </div>
                ))}
            </div>
        )
    }

    getWidthFromEvent(event) {
        // 8px is width of resizer block
        return event.clientX + 8;
    }

    onDragStart() {
        this.setState({ isResizing: true });
    }

    onDrag(event) {
        this.updateWidth(this.getWidthFromEvent(event));
    }

    onDragStop(event) {
        const width = this.getWidthFromEvent(event);

        this.updateWidth(width);
        this.width = width;
        window.sessionStorage.setItem('hierarchyPanelWidth', width);
        this.setState({ isResizing: false });
    }

	render() {
		return (
            <div className={classNames('pad__hierarchy', {
                    'pad__hierarchy--loading' : this.state.isLoading,
                    'pad__hierarchy--resizing' : this.state.isResizing
                })}>
                <Draggable
                    axis='none'
                    onStart={this.onDragStart.bind(this)}
                    onDrag={this.onDrag.bind(this)}
                    onStop={this.onDragStop.bind(this)}>
                    <div className='pad__hierarchy__resizer'></div>
                </Draggable>
                <div className='pad__hierarchy__scrollbox'>
                    <div className='pad__hierarchy__inner'>
                        {/*
                        <div className='pad__hierarchy__search'>
                            <input className='input' />
                        </div>
                        */}
                        <Spinner className='pad__hierarchy__spinner' />
                        <div className={classNames('pad__hierarchy__node pad__hierarchy__node--root pad__hierarchy__node--main', {
                                'pad__hierarchy__node--active': this.props.currentPad.id === 'root'
                            })}>
                            <div className='pad__hierarchy__node__title' onClick={this.goToPad.bind(this, ['root'])}>Open companies</div>
                        </div>
                        {this.props.padsHierarchy ? this.buildList(this.props.padsHierarchy.children || [], ['root']) : null}
                    </div>
                </div>
            </div>
		);
	}

    componentWillUnmount() {
        this.updateWidth(null);
    }
}