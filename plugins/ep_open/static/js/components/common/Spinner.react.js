import React, { Component } from 'react';
import Spinner from 'spin';
import Base from '../Base.react';

export default class SpinnerComponent extends Base {
    static propTypes = {
        color: React.PropTypes.string
    }

    componentDidMount() {
        this.spinner = new Spinner({
            color: this.props.color || '#000',
            lines: 11,
            length: 7,
            width: 3,
            radius: 8
        }).spin(this.refs.avatarSpinner);
        this.spinner.spin(this.refs.container);
    }

    render() {
        return <div className={this.props.className || 'spinner__wrapper'} ref='container'></div>;
    }
}