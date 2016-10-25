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
        register: actions.register
    }
})
export default class SignUp extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    componentWillReceiveProps(newProps, props) {
        // If token has been changed, we assume that user is logged in and go to the root page
        if (newProps.token && (!props.token || props.token.id !== newProps.token.id)) {
            this.context.router.push(this.props.modalGoTo || '/');
        }
    }

    signUp(event) {
        event.preventDefault();

        this.props.actions.register({
            email: this.refs.email.value,
            nickname: this.refs.nickname.value,
            password: this.refs.password.value
        });
    }

    render() {
		return (
			<form className='form form--entrance' onSubmit={this.signUp.bind(this)}>
                <h1 className='form__title'>Sign Up</h1>
                <div className='form__row'>
                    <div className='form__row__title'>Email</div>
                    <div className='form__row__field'>
                        <input className='input' type='text' ref='email' />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>Nickname</div>
                    <div className='form__row__field'>
                        <input className='input' type='text' ref='nickname' />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>Password</div>
                    <div className='form__row__field'>
                        <input className='input' type='password' ref='password' />
                    </div>
                </div>
                <button className='btn form__btn' type='submit'>Sign Up</button>
            </form>
		);
	}
}