import window, { document } from 'global';
import React, { Component } from 'react';
import Base from '../Base.react';
import PadsSearchBox from './PadsSearchBox.react';

export default class PadsSearch extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    render() {
		return (
			<form className='form form--pad'>
                <h1 className='form__title'>Open or create pad</h1>
                <div className='form__row'>
                    <div className='form__row__field'>
                        <PadsSearchBox
                            autofocus={true}
                            onChange={pad => pad.id && this.context.router.push(`/pads/${pad.id}`)} />
                    </div>
                </div>
            </form>
		);
	}
}