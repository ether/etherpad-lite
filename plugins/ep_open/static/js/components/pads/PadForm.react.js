import window, { document } from 'global';
import React, { Component } from 'react';
import { branch } from 'baobab-react/decorators';
import classNames from 'classnames';
import Base from '../Base.react';
import * as actions from '../../actions/pads';

@branch({
    cursors: {
        pad: ['currentPad'],
        newPad: ['newPad']
    },
	actions
})
export default class PadForm extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.isNew = !props.params.padId;
        this.state = {
            pad: this.isNew ? {} : this.formatPad(props.pad)
        };

        if (!this.isNew) {
            props.actions.getCurrentPad(props.params.padId);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.isNew) {
            if (nextProps.newPad && (!this.props.newPad || this.props.newPad.id !== nextProps.newPad.id)) {
                this.goToPad(nextProps.newPad.id);
                this.props.actions.clearNewPad();
            }
        } else {
            if (nextProps.pad && nextProps.pad !== this.props.pad) {
                if (this.props.pad.id) {
                    this.goToPad();
                } else {
                    this.setState({
                        pad: this.formatPad(nextProps.pad)
                    });
                }
            }
        }
    }

    formatPad(pad) {
        return Object.assign({}, pad);
    }

    goToPad(id) {
        this.context.router.push(`/pads/${id || this.props.params.padId}`);
    }

    submit(event) {
        event.preventDefault();

        const pad = {
            title: this.state.pad.title,
            description: this.state.pad.description
        };

        if (this.isNew) {
            this.props.actions.createPad(pad);
        } else {
            this.props.actions.updatePad(pad);
        }
    }

    render() {
		return (
			<form className='form form--pad' onSubmit={this.submit.bind(this)}>
                <h1 className='form__title'>{this.isNew ? 'New' : 'Edit'} pad</h1>
                <div className='form__row'>
                    <div className='form__row__title'>Name</div>
                    <div className='form__row__field'>
                        <input className='input' type='text' valueLink={this.linkState('pad.title')} autoFocus />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>Description</div>
                    <div className='form__row__field'>
                        <textarea className='input input--textarea' valueLink={this.linkState('pad.description')} />
                    </div>
                </div>
                <button className='btn form__btn' type='submit'>{this.isNew ? 'Create' : 'Save'}</button>
            </form>
		);
	}
}