import window, { document } from 'global';
import React, { Component } from 'react';
import Select from 'react-select';
import { branch } from 'baobab-react/decorators';
import { debounce } from 'lodash';
import request from '../../utils/request';
import Base from '../Base.react';
import * as actions from '../../actions/pads';

@branch({
    cursors: {
        newPad: ['newPad']
    },
	actions
})
export default class PadsSearchBox extends Base {
    static propTypes = {
        onChange: React.PropTypes.func.isRequired,
        autofocus: React.PropTypes.bool,
        filter: React.PropTypes.func
    };

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            selectedPad: null
        };
        this.loadPads = query => {
            return request('/pads', {
                data: { query }
            }).then(data => ({
                options: data.rows.map(pad => ({
                    value: pad.id,
                    label: pad.title
                })).concat({
                    value: query,
                    label: `Create new pad with name "${query}"`,
                    isNew: true,
                    type: 'child'
                }, {
                    value: query,
                    label: `Create new company pad with name "${query}"`,
                    isNew: true,
                    type: 'company'
                })
            }));
        };

        this.clearValue = this.clearValue.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.newPad && (!this.props.newPad || this.props.newPad.id !== nextProps.newPad.id)) {
            this.props.actions.clearNewPad();
            this.setState({
                isLoading: false,
                selectedPad: {
                    value: nextProps.newPad.id,
                    label: nextProps.newPad.title
                }
            });
            this.props.onChange({
                id: nextProps.newPad.id,
                title: nextProps.newPad.title,
                isNew: true
            });
        }
    }

    padChange(selectedPad) {
        if (!selectedPad) {
            this.props.onChange({
                id: null,
                title: null,
                isNew: false
            });
            this.setState({ selectedPad });
        } else if (selectedPad.isNew) {
            this.setState({
                isLoading: true,
                selectedPad: {
                    value: selectedPad.value,
                    label: selectedPad.value
                }
            });
			this.props.actions.createPad({
                title: selectedPad.value,
                type: selectedPad.type
            });
		} else {
            this.setState({ selectedPad });
            this.props.onChange({
                id: selectedPad.value,
                title: selectedPad.label,
                isNew: false
            });
		};
    }

    clearValue() {
        this.setState({ selectedPad: null });
    }

    filterSelectOptions(options, filterValue, excludeOptions) {
		let filteredOptions = options.filter(option => option.label.toLowerCase().search(filterValue.toLowerCase()) > -1);

        if (this.props.filter) {
            filteredOptions = this.props.filter(filteredOptions);
        }

        if (!filterValue) {
            filteredOptions = filteredOptions.filter(option => !option.isNew);
        }

        return filteredOptions;
	}

    render() {
		return (
            <Select.Async
                name='pad-name'
                placeholder='Pad name'
                autofocus={this.props.autofocus}
                value={this.state.selectedPad}
                isLoading={this.state.isLoading}
                onChange={this.padChange.bind(this)}
                ignoreCase={false}
                filterOptions={this.filterSelectOptions.bind(this)}
                loadOptions={this.loadPads} />
		);
	}
}