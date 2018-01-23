const {CompositeDisposable, Disposable} = require('via');
const ActionBarView = require('./action-bar-view');

class ActionBar {
    activate(){
        this.subscriptions = new CompositeDisposable();
        this.actionBar = new ActionBarView();
        this.attachActionBar();
    }

    deactivate(){
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

    provideActionBar(){
        return this.actionBar;
    }

    attachActionBar(){
        if(this.actionBarPanel){
            this.actionBarPanel.destroy();
        }

        this.actionBarPanel = via.workspace.addHeaderPanel({item: this.actionBar.element, priority: 1, className: 'action-bar-panel'});
    }
}

module.exports = new ActionBar();
