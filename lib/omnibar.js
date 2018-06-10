const {Disposable, CompositeDisposable, Emitter} = require('via');
const etch = require('etch');
const $ = etch.dom;
const fuzzaldrin = require('fuzzaldrin');
const _ = require('underscore-plus');

module.exports = class Omnibar {
    constructor(){
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.scope = this.getDefaultScope();
        this.activeElement = this.scope.element;
        this.items = [];
        this.defaultItems = [];
        this.markets = [];
        this.query = '';
        this.mousedown = false;
        this.focused = false;

        etch.initialize(this);
        this.computeItems(false);

        this.didFocusInput = this.didFocusInput.bind(this);
        this.didBlurInput = this.didBlurInput.bind(this);
        this.didChangeQuery = this.didChangeQuery.bind(this);
        this.didMouseDown = this.didMouseDown.bind(this);
        this.didMouseUp = this.didMouseUp.bind(this);

        this.loadDefaultItems = _.throttle(this.loadDefaultItems.bind(this), 500);

        this.element.addEventListener('mousedown', this.didMouseDown);
        window.addEventListener('mouseup', this.didMouseUp);

        this.refs.search.addEventListener('focus', this.didFocusInput);
        this.refs.search.addEventListener('blur', this.didBlurInput);
        this.refs.search.addEventListener('input', this.didChangeQuery);

        this.disposables.add(new Disposable(() => {
            this.element.removeEventListener('mousedown', this.didMouseDown);
            window.removeEventListener('mouseup', this.didMouseUp);

            this.refs.search.removeEventListener('focus', this.didFocusInput);
            this.refs.search.removeEventListener('blur', this.didBlurInput);
            this.refs.search.removeEventListener('input', this.didChangeQuery);
        }));

        //Eventually enable these more gracefully. Can't have them executing hundreds of times on load / unload.
        this.disposables.add(via.commands.onDidRegisterCommand(this.loadDefaultItems));
        this.disposables.add(via.commands.onDidUnregisterCommand(this.loadDefaultItems));
        this.disposables.add(via.packages.onDidActivatePackage(this.loadDefaultItems));
        this.disposables.add(via.packages.onDidDeactivatePackage(this.loadDefaultItems));
        this.disposables.add(via.config.observe('symbol-explorer.hideInactiveMarkets', this.recalculateMarkets.bind(this)));

        via.markets.initialize().then(this.recalculateMarkets.bind(this));

        this.registerViaCommands();
        this.loadDefaultItems();
    }

    async recalculateMarkets(){
        this.markets = via.markets.all()
        .filter(market => {
            if(via.config.get('symbol-explorer.hideInactiveMarkets') && !market.active) return false;
            if(market.type !== 'SPOT') return false;

            return true;
        })
        .map(market => {
            return {group: 'markets', name: market.title, description: market.description, market};
        });

        this.loadDefaultItems();
    }

    didFocusInput(){
        this.focused = true;
        this.updateClasses();
    }

    didBlurInput(){
        this.focused = false;
        this.updateClasses();
    }

    didMouseDown(){
        this.mousedown = true;
        this.updateClasses();
    }

    didMouseUp(){
        this.mousedown = false;
        this.updateClasses();
    }

    getDefaultScope(){
        return {
            maxResultsPerCategory: 5,
            element: via.views.getView(via.workspace),
            didConfirmSelection: selection => {
                if(selection.command){
                    const event = new CustomEvent(selection.command, {bubbles: true, cancelable: true});
                    this.activeElement.dispatchEvent(event);
                }else if(selection.market){
                    via.workspace.open(`via://charts/market/${selection.market.uri()}`, {});
                }else if(selection.package){
                    via.workspace.open(selection.package.uri, {});
                }
            }
        };
    }

    render(){
        return $.div({classList: 'omnibar'},
            $.div({classList: 'omnibar-input'},
                $.svg({class: 'bolt', viewBox: '0 0 50 50', width: 14, height: 14},
                    $.path({d: 'M26.977,22.248L29.74,5L10.778,27.752h12.246L20.259,45l18.963-22.752H26.977z'})
                ),
                $.div({classList: 'scope'}, this.scope.name ? this.scope.name : 'Via'),
                $.div({classList: 'caret'}, '>'),
                $.input({
                    type: 'text',
                    classList: 'search native-key-bindings',
                    ref: 'search',
                    placeholder: this.scope.placeholder ? this.scope.placeholder : 'Search Markets and Commands...'
                }, 'via'),
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
            $.div({classList: 'omnibar-results', ref: 'results'}, this.renderItems())
        );
    }

    async loadDefaultItems(){
        //Load keybindings
        const keybindings = via.keymaps.findKeyBindings({target: this.activeElement});

        //Commands
        const commands = via.commands.findCommands({target: this.activeElement}).map(command => {
            const keybinding = keybindings.find(kbd => kbd.command === command.name);
            return {group: 'commands', name: command.displayName, description: command.description, keybinding, command: command.name};
        });

        //Markets
        const markets = this.markets;

        //UI Components
        const ui = via.workspace.getOpenerConfigs().map(config => {
            const keybinding = config.command ? keybindings.find(kbd => kbd.command === config.command) : undefined;
            return {group: 'interface', name: config.name, description: config.description, keybinding, package: config};
        });

        //Eventually news stories, etc.
        this.defaultItems = [].concat(commands, markets, ui).sort((a, b) => a.name.localeCompare(b.name));
        this.computeItems(true);
    }

    renderItems(){
        //Get the items
        const items = this.items.slice();

        //Collate them by group
        const groups = {};
        const defaultGroup = [];
        const children = [];
        const max = this.scope.maxResultsPerCategory || Infinity;

        for(const item of items){
            if(item.group){
                groups[item.group] = groups[item.group] || [];
                groups[item.group].push(item);
            }else{
                defaultGroup.push(item);
            }
        }

        for(const entry of defaultGroup.slice(0, max)){
            children.push(this.renderEntry(entry));
        }

        for(const [group, entries] of Object.entries(groups)){
            children.push($.div({classList: 'header'}, group));

            for(const entry of entries.slice(0, max)){
                children.push(this.renderEntry(entry));
            }
        }

        //Print them out
        return $.ol({}, ...children);
    }

    renderEntry(entry, index){
        const matches = fuzzaldrin.match(entry.name, this.getQuery());
        let matchedChars = [];
        let string = '';
        let matching = false;

        for(let i = 0; i < entry.name.length; i++){
            if(matching && matches.indexOf(i) === -1){
                //No longer matching, push the old one
                matchedChars.push($.span({classList: 'match'}, string));
                matching = false;
                string = '';
            }else if(!matching && matches.indexOf(i) !== -1){
                //Started matching, push the old one
                matchedChars.push(string);
                matching = true;
                string = '';
            }

            string += entry.name[i];
        }

        if(string.length){
            matchedChars.push(matching ? $.span({classList: 'match'}, string) : string);
        }

        return $.li({
                classList: 'entry ' + (this.getSelectedItem() === entry ? 'selected' : ''),
                onClick: () => this.didClickItem(entry),
                onMouseOver: () => this.selectItem(entry)
            },
            $('kbd', {classList: ''}, entry.keybinding ? this.humanizeKeystroke(entry.keybinding.keystrokes) : ''),
            $.div({classList: 'name'}, ...matchedChars),
            $.div({classList: 'description'}, entry.description || '')
        );
    }

    humanizeKeystroke(keystrokes){
        return keystrokes ? _.humanizeKeystroke(keystrokes) : '';
    }

    update(){
        if(this.query.length && !this.items.length){
            this.element.classList.add('is-error');
        }else{
            this.element.classList.remove('is-error');
        }

        etch.update(this);
    }

    reset(){
        this.refs.search.value = '';
        this.query = '';
        this.computeItems(true);
    }

    getQuery(){
        return this.query;
    }

    getFilterQuery(){
        return this.scope.filterQuery ? this.scope.filterQuery(this.getQuery()) : this.getQuery();
    }

    didChangeQuery(){
        this.query = this.refs.search.value || '';

        if(this.scope.didChangeQuery){
            this.scope.didChangeQuery(this.getFilterQuery());
        }

        this.computeItems();
    }

    didClickItem(item){
        this.selectItem(item);
        this.confirmSelection();
    }

    getItems(){
        if(this.scope.items){
            return this.scope.items.slice();
        }

        //Return the default items
        return this.defaultItems.slice();
    }

    computeItems(updateComponent){
        const filterFn = this.scope.filter || this.fuzzyFilter.bind(this);
        this.items = filterFn(this.getItems(), this.getFilterQuery());

        if(this.scope.order){
            this.items.sort(this.scope.order);
        }

        if(this.scope.maxResults){
            this.items = this.items.slice(0, this.scope.maxResults);
        }

        this.selectIndex(0, updateComponent);
    }

    fuzzyFilter(items, query){
        if(query.length === 0){
            return items;
        }else{
            const scoredItems = [];

            for (const item of items){
                const string = this.scope.filterKeyForItem ? this.scope.filterKeyForItem(item) : item.name;
                let score = fuzzaldrin.score(string, query);

                if(score > 0){
                    scoredItems.push({item, score});
                }
            }

            scoredItems.sort((a, b) => b.score - a.score);
            return scoredItems.map((i) => i.item);
        }
    }

    registerViaCommands(){
        const commands = {
            'core:move-up': event => {
                this.selectPrevious();
                event.stopPropagation();
            },
            'core:move-down': event => {
                this.selectNext();
                event.stopPropagation();
            },
            'core:move-to-top': event => {
                this.selectFirst();
                event.stopPropagation();
            },
            'core:move-to-bottom': event => {
                this.selectLast();
                event.stopPropagation();
            },
            'core:confirm': event => {
                this.confirmSelection();
                event.stopPropagation();
            },
            'core:cancel': event => {
                this.blur();
                event.stopPropagation();
            },
            'core:select-all': event => {
                this.highlightQuery();
                event.stopPropagation();
            }
        }

        this.disposables.add(via.commands.add('via-workspace', 'action-bar:omnibar-focus', this.focus.bind(this)));
        this.disposables.add(via.commands.add(this.element, commands));
    }

    highlightQuery(){
        this.refs.search.select();
    }

    getSelectedItem(){
        return this.items[this.selectionIndex];
    }

    selectPrevious(){
        return this.selectIndex(this.selectionIndex - 1);
    }

    selectNext(){
        return this.selectIndex(this.selectionIndex + 1);
    }

    selectFirst(){
        return this.selectIndex(0);
    }

    selectLast(){
        return this.selectIndex(this.items.length - 1);
    }

    confirmSelection(){
        const selectedItem = this.getSelectedItem();

        if(selectedItem != null){
            if(this.scope.didConfirmSelection){
                this.scope.didConfirmSelection(selectedItem);
            }
        }else{
            if(this.scope.didConfirmEmptySelection){
                this.scope.didConfirmEmptySelection();
            }
        }

        this.emitter.emit('will-change-scope', this.scope);
        this.scope = this.getDefaultScope();
        this.emitter.emit('did-change-scope', this.scope);
        this.reset();

        //TODO have it re-focus the previouslyFocusedElement
        this.refs.search.blur();
    }

    cancelSelection(resetScope){
        if(this.scope.didCancelSelection){
            this.scope.didCancelSelection();
        }

        if(resetScope){
            this.emitter.emit('will-change-scope', this.scope);
            this.scope = this.getDefaultScope();
            this.emitter.emit('did-change-scope', this.scope);
        }
    }

    selectIndex(index, updateComponent = true){
        if(index >= this.items.length){
            index = 0;
        }else if(index < 0){
            index = this.items.length - 1;
        }

        this.selectionIndex = index;

        // console.log('SELECTED INDEX ' + index);

        if(this.scope.didChangeSelection){
            this.scope.didChangeSelection(this.getSelectedItem());
        }

        if(updateComponent){
            return this.update();
        }else{
            return Promise.resolve();
        }
    }

    selectItem(item){
        const index = this.items.indexOf(item);

        if(index === -1){
            throw new Error('Cannot select the specified item because it does not exist.');
        }else{
            return this.selectIndex(index);
        }
    }

    focus(){
        via.tooltips.hideAllTooltips();
        this.activeElement = document.activeElement;
        // console.log(this.activeElement);
        this.refs.search.focus();
        this.refs.search.select();
        this.computeItems(true);
    }

    blur(){
        this.cancelSelection(true);
        this.reset();

        //TODO have it re-focus the previouslyFocusedElement
        this.refs.search.blur();
    }

    updateClasses(){
        if(this.focused || this.mousedown){
            this.element.classList.add('is-focused');
            this.element.classList.remove('is-blurred');
        }else{
            this.element.classList.add('is-blurred');
            this.element.classList.remove('is-focused');
        }
    }

    complete(){
        console.log('Complete Query');
    }

    search(scope){
        this.emitter.emit('will-change-scope', this.scope);
        this.activeElement = scope.element ? via.views.getView(via.workspace) : scope.element;
        this.cancelSelection();
        this.scope = scope;
        this.focus();
        this.emitter.emit('did-change-scope', scope);
    }

    destroy(){
        etch.destroy(this);
        this.disposables.dispose();
    }
}
