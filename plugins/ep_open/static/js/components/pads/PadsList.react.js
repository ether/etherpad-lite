import window from 'global';
import React, { Component } from 'react';
import _ from 'lodash';
import classNames from 'classnames';
import { branch } from 'baobab-react/decorators';
import { Link } from 'react-router';
import { niceDate } from '../../utils/helpers';
import Base from '../Base.react';
import Spinner from '../common/Spinner.react';
import Pagination from '../common/Pagination.react';
import * as actions from '../../actions/pads';

const PER_PAGE = 10;

@branch({
    cursors: {
        pads: ['pads'],
        padsTotal: ['padsTotal']
    },
	actions
})
export default class PadsList extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    }

	constructor(props) {
		super(props);

        this.state = { isLoading: true };

        this.fetchPads(props, true);
	}

	componentWillReceiveProps(nextProps) {
        if (
            this.props.location.query.padsPage !== nextProps.location.query.padsPage
        ) {
            this.fetchPads(nextProps);
        }

        if (this.props.pads !== nextProps.pads) {
            this.setState({ isLoading: false });
        }
	}

    getCurrentPage(props = this.props) {
        return parseInt(props.location.query.padsPage || 1);
    }

    fetchPads(props, isInit) {
        const data = {
            page: this.getCurrentPage(props),
            perPage: PER_PAGE
        }

        !isInit && this.setState({ isLoading: true });

        this.props.actions.fetchPads(data);
    }

    createNewPad() {
        this.context.router.push(`/pads/new`);
    }

	render() {
		return (
            <div className='section'>
                <h2 className='section__title'>
                    <button className='btn for_authorized' onClick={this.createNewPad.bind(this)}>create</button>
                    Pads
                </h2>
                <div className='pads_list'>
                    {(this.props.pads || []).map(pad => (
                        <div key={pad.id} className='pads_list__item'>
                            <div className='pads_list__item__stat'>
                                <div className='pads_list__item__stat__item'>
                                    <div className='pads_list__item__stat__item__value'>{pad.rating || 0}</div>
                                    votes
                                </div>
                                <div className='pads_list__item__stat__item pads_list__item__stat__item--solution'>
                                    <div className='pads_list__item__stat__item__value'>{pad.responsesCount || 0}</div>
                                    solutions
                                </div>
                                <div className='pads_list__item__stat__item'>
                                    <div className='pads_list__item__stat__item__value'>{pad.views || 0}</div>
                                    views
                                </div>
                            </div>
                            <div className='pads_list__item__info'>
                                <Link className='pads_list__item__title' to={`/pads/${pad.id}`}>
                                    {pad.title}
                                </Link>
                                <div className='pads_list__item__meta'>
                                    opened {niceDate(pad.createdAt)} by <a className='pads_list__item__author' href='#'>{pad.owner.nickname}</a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <Pagination
                    name='padsPage'
                    perPage={PER_PAGE}
                    total={this.props.padsTotal}
                    currentPage={this.getCurrentPage()} />
                <Spinner className={classNames('section__spinner', { 'hidden': !this.state.isLoading })} />
            </div>
		);
	}
}