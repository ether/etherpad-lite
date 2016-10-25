import React, { Component } from 'react';
import { Link } from 'react-router';

export default class LinkButton extends Component {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    render() {
        return (
            <button {...this.props} onClick={this.context.router.push.bind(this, this.props.to)}>
                {this.props.children}
            </button>
        );
    }
}