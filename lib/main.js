const {CompositeDisposable, Disposable} = require('via');
const ActionBarView = require('./action-bar-view');

module.exports = class ActionBar {
    static activate(){
        this.subscriptions = new CompositeDisposable();
        this.actionBar = new ActionBarView();
        this.attachActionBar();
        this.updateActionBarVisibility();

        this.actionBarVisibilitySubscription = via.config.observe('action-bar.isVisible', () => {
            this.updateActionBarVisibility();
        });

        via.commands.add('via-workspace', 'action-bar:toggle', () => {
            via.config.set('action-bar.isVisible', !this.actionBarPanel.isVisible());
        });
    }

    static deactivate(){
        if(this.actionBarVisibilitySubscription){
            this.actionBarVisibilitySubscription.dispose();
            this.actionBarVisibilitySubscription = null;
        }

        if(this.actionBarPanel){
            this.actionBarPanel.destroy();
            this.actionBarPanel = null;
        }

        if(this.actionBar){
            this.actionBar.destroy();
            this.actionBar = null;
        }

        this.subscriptions.dispose();
        this.subscriptions = null;
    }

    static updateActionBarVisibility(){
        via.config.get('action-bar.isVisible') ? this.actionBarPanel.show() : this.actionBarPanel.hide();
    }

    static provideActionBar(){
        return {
            addLeftTile: this.actionBar.addLeftTile.bind(this.actionBar),
            addRightTile: this.actionBar.addRightTile.bind(this.actionBar),
            getLeftTiles: this.actionBar.getLeftTiles.bind(this.actionBar),
            getRightTiles: this.actionBar.getRightTiles.bind(this.actionBar)
        };
    }

    static attachActionBar(){
        if(this.actionBarPanel){
            this.actionBarPanel.destroy();
        }

        this.actionBarPanel = via.workspace.addHeaderPanel({item: this.actionBar, priority: 1, className: 'action-bar-panel'});
    }
}
