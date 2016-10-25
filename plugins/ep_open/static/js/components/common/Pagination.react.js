import _ from 'lodash';
import React, { Component } from 'react';
import Base from '../Base.react';

export default class Pagination extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired,
        location: React.PropTypes.object.isRequired
    }

    static propTypes = {
        name: React.PropTypes.string.isRequired,
        total: React.PropTypes.number.isRequired,
        perPage: React.PropTypes.number.isRequired,
        currentPage: React.PropTypes.number.isRequired
    }

    changePage(page, event) {
        this.context.router.push({
            pathname: this.context.location.pathname,
            query: Object.assign({}, this.context.location.query, { [this.props.name]: page })
        });

        event.preventDefault();
    }

    render() {
        if (this.props.total > this.props.perPage) {
            const pageCount = Math.ceil(this.props.total / this.props.perPage);
            const currentPage = this.props.currentPage;
            let startRange = Math.max(1, currentPage - 1);
            let endRange = Math.min(pageCount, currentPage + 1);

            if (endRange - startRange < 2) {
                if (startRange === 1) {
                    endRange = Math.min(pageCount, endRange + 1);
                } else if (endRange === pageCount) {
                    startRange = Math.max(1, startRange - 1);
                }
            }

            const pages = _.range(startRange, endRange + 1);

            if (startRange > 1) {
                startRange !== 2 && pages.splice(0, 0, 'divider');
                pages.splice(0, 0, 1);
            }

            if (endRange < pageCount) {
                endRange !== pageCount - 1 && pages.push('divider');
                pages.push(pageCount);
            }

            return (
                <div className='pagination'>
                    <div className='pagination__inner'>
                        {pages.map((page, index) => {
                            if (page === 'divider') {
                                return <span key={index} className='pagination__item pagination__item--divider'>...</span>;
                            } else if (page === currentPage) {
                                return <span key={index} className='pagination__item pagination__item--active'>{page}</span>;
                            } else {
                                return (
                                    <a
                                        key={index}
                                        className='pagination__item'
                                        href={'?padsPage=' + page}
                                        onClick={this.changePage.bind(this, page)}>
                                        {page}
                                    </a>
                                );
                            }
                        })}
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }
}