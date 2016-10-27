import React, { Component } from 'react';
import classNames from 'classnames';
import { branch } from 'baobab-react/decorators';
import { Link } from 'react-router';;
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

        this.state = {
            isLoading: props.isActive
        };
        props.isActive && this.props.actions.fetchHierarchy();
	}

    componentWillReceiveProps(nextProps) {
        if (nextProps.isActive && nextProps.isActive !== this.props.isActive && !this.props.padsHierarchy ) {
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

    buildList(list, path) {
        return (
            <div className='pad__hierarchy__list'>
                {list.map(node => (
                    <div
                        key={node.id}
                        className={classNames('pad__hierarchy__node', {
                            'pad__hierarchy__node--root': path.length === 1,
                            'pad__hierarchy__node--active': this.props.currentPad.id === node.id
                        })}>
                        <div
                            className='pad__hierarchy__node__title'
                            onClick={this.goToPad.bind(this, path.concat(node.id))}>{node.title}</div>
                        {node.children ? this.buildList(node.children, path.concat(node.id)) : null}
                    </div>
                ))}
            </div>
        )
    }

	render() {
		return (
            <div className={classNames('pad__hierarchy', { 'pad__hierarchy--loading' : this.state.isLoading })}>
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
		);
	}
}