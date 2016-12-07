import window from 'global';
import React, { Component } from 'react';
import { branch } from 'baobab-react/decorators';
import Base from '../Base.react';
import * as actions from '../../actions/user';

@branch({
    cursors: {
        token: ['token']
    },
    actions: {
        socialAuth: actions.socialAuth,
        auth: actions.auth
    }
})
export default class SignIn extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    componentWillReceiveProps(newProps, props) {
        // If token has been changed, we assume that user is logged in and go to the root page
        if (newProps.token && (!props.token || props.token.id !== newProps.token.id)) {
            this.context.router.push(this.props.location.state.goTo || '/');
        }
    }

    socialAuth(provider) {
        this.props.actions.socialAuth(provider);
    }

    signIn(event) {
        event.preventDefault();

        this.props.actions.auth({
            email: this.refs.email.value,
            password: this.refs.password.value,
            remember: this.refs.remember.checked
        });
    }

    render() {
		return (
			<form className='form form--entrance' onSubmit={this.signIn.bind(this)}>
                <h1 className='form__title'>Sign In</h1>
                <div className='form__social_btns'>
                    <div className='form__social_btn form__social_btn--google' onClick={this.socialAuth.bind(this, 'google')} />
                    <div className='form__social_btn form__social_btn--github' onClick={this.socialAuth.bind(this, 'github')} />
                </div>
                <div className='form__divider'>or</div>
                <div className='form__row'>
                    <div className='form__row__title'>Email</div>
                    <div className='form__row__field'>
                        <input className='input' type='text' ref='email' />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>Password</div>
                    <div className='form__row__field'>
                        <input className='input' type='password' ref='password' />
                    </div>
                </div>
                <div className='form__row'>
                    <label className='checkbox__label'>
                        <div className='checkbox'>
                            <input className='checkbox__el' type='checkbox' ref='remember' />
                            <i className='checkbox__icon' />
                        </div>
                        Remember me
                    </label>
                </div>
                <button className='btn form__btn' type='submit'>Sign In</button>
            </form>
		);
	}
}