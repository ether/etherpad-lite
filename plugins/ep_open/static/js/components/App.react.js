import React, { Component } from 'react';
import { branch } from 'baobab-react/decorators';
import classNames from 'classnames';
import DocumentTitle from 'react-document-title';
import Header from './Header.react';
import Modal from './Modal.react';
import Notifications from './Notifications.react';
import * as errorsActions from '../actions/errors';

@branch({
	cursors: {
		user: ['currentUser'],
		errors: ['errors'],
		layoutModes: ['layoutModes']
	},
	actions: {
		removeError: errorsActions.removeError
	}
})
class App extends Component {
	static childContextTypes = {
		location: React.PropTypes.object
	}

	getChildContext() {
		return { location: this.props.location }
	}

	componentWillReceiveProps(nextProps) {
		// if we changed routes...
		if ((
			nextProps.location.key !== this.props.location.key &&
			nextProps.location.state &&
			nextProps.location.state.modal &&
			(!this.props.location.state || !this.props.location.state.modal)
		)) {
			// save the old children (just like animation)
			this.previousChildren = this.props.children;
			this.previousRoutes = this.props.routes;
		}
	}

	render() {
		const { location, user, layoutModes } = this.props;
		const isAuthorized = user && user.id;
	    const isModal = (
			location.state &&
			location.state.modal
		);
		const isPad = (isModal && this.previousRoutes ? this.previousRoutes : this.props.routes).map(r => r.name).indexOf('pad') !== -1;
		let layoutClassNames = 'layout';

		if (layoutModes.length) {
			layoutClassNames += ' ' +  layoutModes.map(mode => `layout--${mode}`).join(' ');
		}

		return (
			<DocumentTitle title="Open Companies">
				<div className={classNames(layoutClassNames, {
						'layout--modal': isModal,
						'layout--authorized': isAuthorized,
						'layout--pad': isPad
					})}>
					<Header {...this.props} />
					<section className='content'>
						<div className='limit'>
							{isModal ? this.previousChildren : this.props.children}
						</div>
					</section>
					{isModal && (
						<Modal {...location.state}>
							{this.props.children}
						</Modal>
					)}
					<Notifications items={this.props.errors || []} close={this.props.actions.removeError} />
				</div>
			</DocumentTitle>
		);
	}
}

export default App;