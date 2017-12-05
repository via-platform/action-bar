const {Disposable, CompositeDisposable, Emitter} = require('via');
const etch = require('etch');
const $ = etch.dom;

module.exports = class Omnibar {
    constructor(){
        this.disposables = new CompositeDisposable();

        etch.initialize(this);

        this.refs.search.addEventListener('focus', this.focused.bind(this));
        this.refs.search.addEventListener('blur', this.blurred.bind(this));
        this.refs.search.addEventListener('input', this.changed.bind(this));

        this.disposables.add(via.commands.add('via-workspace', 'action-bar:omnibar-focus', this.focus.bind(this)));
        this.disposables.add(via.commands.add('via-workspace', 'action-bar:omnibar-blur', this.blur.bind(this)));
        this.disposables.add(via.commands.add('via-workspace', 'action-bar:omnibar-complete', this.complete.bind(this)));
    }

    render(){
        return $.div({classList: 'omnibar'},
            $.div({classList: 'omnibar-input'},
                $.svg({class: 'bolt', viewBox: '0 0 50 50', width: 14, height: 14},
                    $.path({d: 'M26.977,22.248L29.74,5L10.778,27.752h12.246L20.259,45l18.963-22.752H26.977z'})
                ),
                $.div({classList: 'scope'}, 'Via'),
                $.div({classList: 'caret'}, '>'),
                $.input({type: 'text', classList: 'search native-key-bindings', ref: 'search', placeholder: 'Enter a Symbol or Command...'}, 'via'),
                $.div({classList: 'keybindings'},
                    $('kbd', {}, '↑'),
                    $('kbd', {}, '↓'),
                    $.div({}, 'to navigate'),
                    $('kbd', {}, '↵'),
                    $.div({}, 'to select'),
                    $('kbd', {}, 'ESC'),
                    $.div({}, 'to cancel')
                )
            ),
            $.div({classList: 'omnibar-results', ref: 'results'},
                $.ol({},
                    $.div({classList: 'header'}, 'Commands'),
                    ...this.renderCommands(),
                    $.div({classList: 'header'}, 'Symbols'),
                    ...this.renderSymbols(),
                    $.div({classList: 'header'}, 'Interface'),
                    ...this.renderComponents()
                )
            )
        );
    }

    update(){
        etch.update(this);
    }

    renderCommands(){
        let activeElement = (document.activeElement === document.body) ? via.views.getView(via.workspace) : document.activeElement;
        let commands = via.commands.findCommands({target: activeElement});
        commands.sort((a, b) => a.displayName.localeCompare(b.displayName));

        return commands.slice(0, 5).map(command => {
            return $.li({},
                $('kbd', {classList: ''}, '⌘H'),
                $.div({classList: 'name'}, command.displayName),
                $.div({classList: 'description'}, 'Description')
            );
        });
    }

    renderSymbols(){
        let symbols = via.symbols.getSymbols();
        symbols.sort((a, b) => a.name.localeCompare(b.name));

        return symbols.slice(0, 5).map(symbol => {
            return $.li({},
                $('kbd', {classList: ''}, ''),
                $.div({classList: 'name'}, symbol.name),
                $.div({classList: 'description'}, 'Description')
            );
        });
    }

    renderComponents(){
        let ui = via.workspace.getOpenerConfigs();
        ui.sort((a, b) => a.name.localeCompare(b.name));

        return ui.map(config => {
            return $.li({},
                $('kbd', {classList: ''}, ''),
                $.div({classList: 'name'}, config.name),
                $.div({classList: 'description'}, config.description)
            );
        });
    }

    focus(){
        this.refs.search.focus();
        this.refs.search.select();
    }

    blur(){
        this.refs.search.blur();
        this.refs.search.value = '';
    }

    focused(){
        this.element.classList.add('is-focused');
        this.element.classList.remove('is-blurred');
    }

    blurred(){
        this.element.classList.add('is-blurred');
        this.element.classList.remove('is-focused');
    }

    changed(){
        this.update();
    }

    complete(){
        console.log('Complete Query');
    }

    destroy(){
        etch.destroy(this);
        this.disposables.dispose();
    }
}
