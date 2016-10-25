import window, { document } from 'global';
import React, { Component } from 'react';
import Select from 'react-select';
import { branch } from 'baobab-react/decorators';
import classNames from 'classnames';
import Base from '../Base.react';
import * as actions from '../../actions/pads';

@branch({
    cursors: {
        pads: ['pads'],
        newPad: ['newPad']
    },
	actions
})
export default class PadsSearch extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.newPad && (!this.props.newPad || this.props.newPad.id !== nextProps.newPad.id)) {
            this.goToPad(nextProps.newPad.id);
            this.props.actions.clearNewPad();
        }

        if (nextProps.pads !== this.props.pads && this.searchResolve) {
            this.searchResolve({
                options: nextProps.pads.map(pad => ({
                    value: pad.id,
                    label: pad.title
                }))
            });
            this.searchResolve = null;
        }
    }

    padChange(selectedPad) {
		if (selectedPad.isNew) {
			this.props.actions.createPad({
                title: selectedPad.value
            });
		} else {
			this.goToPad(selectedPad.value);
		};
    }

    goToPad(id) {
        this.context.router.push(`/pads/${id || this.props.params.padId}`);
    }

    loadPads(padTitle) {
        return new Promise(resolve => {
            this.props.actions.fetchPads(padTitle);
            this.searchResolve = resolve;
        });
    }

    filterSelectOptions(options, filterValue, excludeOptions) {
		let filteredOptions = options.filter(option => option.label.toLowerCase().search(filterValue.toLowerCase()) > -1);

        if (filterValue.length > 0) {
			filteredOptions = filteredOptions.concat({
				value: filterValue,
				label: `Create new pad with name "${filterValue}"`,
				isNew: true
			});
        }

        return filteredOptions;
	}

    render() {
		return (
			<form className='form form--pad'>
                <h1 className='form__title'>Open or create pad</h1>
                <div className='form__row'>
                    <div className='form__row__field'>
                        <Select.Async
                            name='pad-name'
                            placeholder='Pad name'
							autofocus={true}
                            onChange={this.padChange.bind(this)}
                            ignoreCase={false}
							filterOptions={this.filterSelectOptions}
                            loadOptions={this.loadPads.bind(this)} />
                    </div>
                </div>
            </form>
		);
	}
}