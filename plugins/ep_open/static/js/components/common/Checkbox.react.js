import React, { Component } from 'react';
import classNames from 'classnames';

export default class LinkButton extends Component {
    static propTypes = {
        checkedLink: React.PropTypes.object.isRequired,
        label: React.PropTypes.string,
        disabled: React.PropTypes.bool
    };

    render() {
        return (
            <label className={classNames('checkbox__label', {
                    'checkbox__label--disabled': this.props.disabled
                })}>
                <div className='checkbox'>
                    <input
                        className='checkbox__el'
                        type='checkbox'
                        checkedLink={this.props.checkedLink}
                        disabled={this.props.disabled} />
                    <i className='checkbox__icon' />
                </div>
                {this.props.label}
            </label>
        );
    }
}