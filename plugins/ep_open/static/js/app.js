import window from 'global';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRedirect, browserHistory } from 'react-router';
import { Root } from 'baobab-react/wrappers';
import tree from './store';
import App from './components/App.react';
import Pad from './components/pads/Pad.react';
import PadsSearch from './components/pads/PadsSearch.react';
import PadForm from './components/pads/PadForm.react';
import SignIn from './components/user/SignIn.react';
import SignUp from './components/user/SignUp.react';
import Profile from './components/user/Profile.react';
import ProfilePassword from './components/user/ProfilePassword.react';
import { initToken } from './actions/user';

function init() {
	initToken(tree);

	ReactDOM.render((
		<Root tree={tree}>
			<Router history={browserHistory}>
				<Route name='app' path='/' component={App}>
					<IndexRedirect to='/pads' />
					<Route name='pad' path='/pads' component={PadsSearch} />
					<Route name='pad' path='/pads/new' component={PadForm} />
					<Route name='pad' path='/pads/:padId' component={Pad} />
					<Route name='pad' path='/pads/:padId/edit' component={PadForm} />
					<Route name='signin' path='/signin' component={SignIn} />
					<Route name='signup' path='/signup' component={SignUp} />
					<Route name='profile' path='/profile' component={Profile} />
					<Route name='profilePassword' path='/profile/password' component={ProfilePassword} />
				</Route>
			</Router>
		</Root>
	), document.getElementById('app-root'));
};

window.onload = init;