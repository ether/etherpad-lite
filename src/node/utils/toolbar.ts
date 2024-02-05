'use strict';
/**
 * The Toolbar Module creates and renders the toolbars and buttons
 */
const _ = require('underscore');

const removeItem = (array: string[], what: string) => {
    let ax;
    while ((ax = array.indexOf(what)) !== -1) {
        array.splice(ax, 1);
    }
    return array;
};

const defaultButtonAttributes = (name: string, overrides?: boolean) => ({
    command: name,
    localizationId: `pad.toolbar.${name}.title`,
    class: `buttonicon buttonicon-${name}`,
});

const tag = (name: string, attributes: AttributeObj, contents?: string) => {
    const aStr = tagAttributes(attributes);

    if (_.isString(contents) && contents!.length > 0) {
        return `<${name}${aStr}>${contents}</${name}>`;
    } else {
        return `<${name}${aStr}></${name}>`;
    }
};


type AttributeObj = {
    [id: string]: string
}

const tagAttributes = (attributes: AttributeObj) => {
    attributes = _.reduce(attributes || {}, (o: AttributeObj, val: string, name: string) => {
        if (!_.isUndefined(val)) {
            o[name] = val;
        }
        return o;
    }, {});

    return ` ${_.map(attributes, (val: string, name: string) => `${name}="${_.escape(val)}"`).join(' ')}`;
};

type ButtonGroupType = {
    grouping: string,
    render: Function
}

class ButtonGroup {
    private buttons: Button[]

    constructor() {
        this.buttons = []
    }

    public static fromArray = function (array: string[]) {
        const btnGroup = new ButtonGroup();
        _.each(array, (btnName: string) => {
            const button = Button.load(btnName) as Button
            btnGroup.addButton(button);
        });
        return btnGroup;
    }

    private addButton(button: Button) {
        this.buttons.push(button);
        return this;
    }

    render() {
        if (this.buttons && this.buttons.length === 1) {
            this.buttons[0].grouping = '';
        } else if (this.buttons && this.buttons.length > 1) {
            _.first(this.buttons).grouping = 'grouped-left';
            _.last(this.buttons).grouping = 'grouped-right';
            _.each(this.buttons.slice(1, -1), (btn: Button) => {
                btn.grouping = 'grouped-middle';
            });
        }

        return _.map(this.buttons, (btn: ButtonGroup) => {
            if (btn) return btn.render();
        }).join('\n');
    }
}


class Button {
    protected attributes: AttributeObj
    grouping: string

    constructor(attributes: AttributeObj) {
        this.attributes = attributes
        this.grouping = ""
    }

    public static load(btnName: string) {
        const button = module.exports.availableButtons[btnName];
        try {
            if (button.constructor === Button || button.constructor === SelectButton) {
                return button;
            } else {
                return new Button(button);
            }
        } catch (e) {
            console.warn('Error loading button', btnName);
            return false;
        }
    }

    render() {
        const liAttributes = {
            'data-type': 'button',
            'data-key': this.attributes.command,
        };
        return tag('li', liAttributes,
            tag('a', {'class': this.grouping, 'data-l10n-id': this.attributes.localizationId},
                tag('button', {
                    'class': ` ${this.attributes.class}`,
                    'data-l10n-id': this.attributes.localizationId,
                })));
    }
}

type SelectButtonOptions = {
    value: string,
    text: string,
    attributes: AttributeObj
}

class SelectButton extends Button {
    private readonly options: SelectButtonOptions[];

    constructor(attrs: AttributeObj) {
        super(attrs);
        this.options = []
    }

    addOption(value: string, text: string, attributes: AttributeObj) {
        this.options.push({
            value,
            text,
            attributes,
        })
        return this;
    }

    select(attributes: AttributeObj) {
        const options: string[] = [];

        _.each(this.options, (opt: AttributeSelect) => {
            const a = _.extend({
                value: opt.value,
            }, opt.attributes);

            options.push(tag('option', a, opt.text));
        });
        return tag('select', attributes, options.join(''));
    }

    render() {
        const attributes = {
            'id': this.attributes.id,
            'data-key': this.attributes.command,
            'data-type': 'select',
        };
        return tag('li', attributes, this.select({id: this.attributes.selectId}));
    }
}


type AttributeSelect = {
    value: string,
    attributes: AttributeObj,
    text: string
}

class Separator {
    constructor() {
    }

    public render() {
        return tag('li', {class: 'separator'});

    }
}

module.exports = {
    availableButtons: {
        bold: defaultButtonAttributes('bold'),
        italic: defaultButtonAttributes('italic'),
        underline: defaultButtonAttributes('underline'),
        strikethrough: defaultButtonAttributes('strikethrough'),

        orderedlist: {
            command: 'insertorderedlist',
            localizationId: 'pad.toolbar.ol.title',
            class: 'buttonicon buttonicon-insertorderedlist',
        },

        unorderedlist: {
            command: 'insertunorderedlist',
            localizationId: 'pad.toolbar.ul.title',
            class: 'buttonicon buttonicon-insertunorderedlist',
        },

        indent: defaultButtonAttributes('indent'),
        outdent: {
            command: 'outdent',
            localizationId: 'pad.toolbar.unindent.title',
            class: 'buttonicon buttonicon-outdent',
        },

        undo: defaultButtonAttributes('undo'),
        redo: defaultButtonAttributes('redo'),

        clearauthorship: {
            command: 'clearauthorship',
            localizationId: 'pad.toolbar.clearAuthorship.title',
            class: 'buttonicon buttonicon-clearauthorship',
        },

        importexport: {
            command: 'import_export',
            localizationId: 'pad.toolbar.import_export.title',
            class: 'buttonicon buttonicon-import_export',
        },

        timeslider: {
            command: 'showTimeSlider',
            localizationId: 'pad.toolbar.timeslider.title',
            class: 'buttonicon buttonicon-history',
        },

        savedrevision: defaultButtonAttributes('savedRevision'),
        settings: defaultButtonAttributes('settings'),
        embed: defaultButtonAttributes('embed'),
        showusers: defaultButtonAttributes('showusers'),

        timeslider_export: {
            command: 'import_export',
            localizationId: 'timeslider.toolbar.exportlink.title',
            class: 'buttonicon buttonicon-import_export',
        },

        timeslider_settings: {
            command: 'settings',
            localizationId: 'pad.toolbar.settings.title',
            class: 'buttonicon buttonicon-settings',
        },

        timeslider_returnToPad: {
            command: 'timeslider_returnToPad',
            localizationId: 'timeslider.toolbar.returnbutton',
            class: 'buttontext',
        },
    },

    registerButton(buttonName: string, buttonInfo: any) {
        this.availableButtons[buttonName] = buttonInfo;
    },

    button: (attributes: AttributeObj) => new Button(attributes),

    separator: () => (new Separator()).render(),

    selectButton: (attributes: AttributeObj) => new SelectButton(attributes),

    /*
     * Valid values for whichMenu: 'left' | 'right' | 'timeslider-right'
     * Valid values for page:      'pad'  | 'timeslider'
     */
    menu(buttons: string[][], isReadOnly: boolean, whichMenu: string, page: string) {
        if (isReadOnly) {
            // The best way to detect if it's the left editbar is to check for a bold button
            if (buttons[0].indexOf('bold') !== -1) {
                // Clear all formatting buttons
                buttons = [];
            } else {
                // Remove Save Revision from the right menu
                removeItem(buttons[0], 'savedrevision');
            }
        } else if ((buttons[0].indexOf('savedrevision') === -1) &&
            (whichMenu === 'right') && (page === 'pad')) {
            /*
             * This pad is not read only
             *
             * Add back the savedrevision button (the "star") if is not already there,
             * but only on the right toolbar, and only if we are showing a pad (dont't
             * do it in the timeslider).
             *
             * This is a quick fix for #3702 (and subsequent issue #3767): it was
             * sufficient to visit a single read only pad to cause the disappearence
             * of the star button from all the pads.
             */
            buttons[0].push('savedrevision');
        }

        const groups = _.map(buttons, (group: string[]) => ButtonGroup.fromArray(group).render());
        return groups.join(this.separator());
    },
};
