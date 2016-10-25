import React, { Component } from 'react';
import { Link } from 'react-router';
import window, { document } from 'global';
//import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

export default class Modal extends Component {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    constructor() {
        super();
        this.state = { modalTop: 0};
        this.closeModal = this.closeModal.bind(this);
    }

    handleResize() {
        this.setState({
            modalTop: Math.max((window.innerHeight - this.refs.content.offsetHeight) / 2, 0)
        });
    }

    closeModal(event) {
        if (event.type === 'click' || event.keyCode === 27) {
            this.context.router.push(this.props.returnTo || '/');
        }
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleResize);
        document.body.addEventListener('keydown', this.closeModal);
        this.handleResize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
        document.body.removeEventListener('keydown', this.closeModal);
    }

    render() {
        const children = React.Children.map(this.props.children, child => React.cloneElement(child, {
            updateModal: this.handleResize,
            modalGoTo: this.props.goTo
        }));

        return (
            <div className="modal">
                <div className="modal__close" onClick={this.closeModal} />
                <div className="modal__content" ref="content" style={{ top: this.state.modalTop }}>
                    {children}
                </div>
            </div>
        );
    }
}