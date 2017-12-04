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
                $.div({classList: 'scope'}, 'Via'),
                $.div({classList: 'caret'}, '>'),
                $.input({type: 'text', classList: 'search native-key-bindings', ref: 'search', placeholder: 'Enter a Symbol or Command...'}, 'via')
            ),
            $.div({classList: 'omnibar-results', ref: 'results'},
                $.ol({},
                    $.div({classList: 'header'}, 'Commands'),
                    ...this.renderCommands(),
                    $.div({classList: 'header'}, 'Symbols'),
                    ...this.renderSymbols()
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

        return commands.slice(0, 6).map(command => {
            return $.li({}, command.displayName);
        });
    }

    renderSymbols(){
        let symbols = via.symbols.getSymbols();
        symbols.sort((a, b) => a.name.localeCompare(b.name));

        return symbols.slice(0, 6).map(symbol => {
            return $.li({}, symbol.name);
        });
    }

    focus(){
        this.refs.search.focus();
        this.refs.search.select();
    }

    blur(){
        this.refs.search.blur();
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
