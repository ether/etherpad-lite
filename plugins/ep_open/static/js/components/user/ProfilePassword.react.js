import window from 'global';
import React from 'react';
import { branch } from 'baobab-react/decorators';
import Base from '../Base.react';
import { changePassword } from '../../actions/user';
import { addError } from '../../actions/errors';

@branch({
    cursors: {
        user: ['currentUser']
    },
    actions: {
        changePassword: changePassword,
        addError: addError
    }
})
export default class ProfilePassword extends Base {
    constructor(props) {
        super(props);
        this.state = {
            current: '',
            new: '',
            confirm: ''
        };
    }

    componentWillReceiveProps(newProps, props) {
        if (this.state.user !== newProps.user) {
            //this.state.user = Object.assign({}, newProps.user);
        }
    }

    submit(event) {
        event.preventDefault();

        if (this.state.new && this.state.new === this.state.confirm) {
            this.props.actions.changePassword({
                current: this.state.current,
                new: this.state.new
            });
        } else {
            this.props.actions.addError('Confirmation of new password is not match');
        }
    }

    render() {
		return (
			<form className='form form--entrance' onSubmit={this.submit.bind(this)}>
                <h1 className='form__title'>Change password</h1>
                <div className='form__row'>
                    <div className='form__row__title'>Current password</div>
                    <div className='form__row__field'>
                        <input className='input' type='password' valueLink={this.linkState('current')} />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>New password</div>
                    <div className='form__row__field'>
                        <input className='input' type='password' valueLink={this.linkState('new')} />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>Confirm new password</div>
                    <div className='form__row__field'>
                        <input className='input' type='password' valueLink={this.linkState('confirm')} />
                    </div>
                </div>
                <button className='btn form__btn' type='submit'>Change</button>
            </form>
		);
	}
}