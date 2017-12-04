const {Disposable} = require('via');
const Tile = require('./tile');
const _ = require('underscore-plus');

const Omnibar = require('./omnibar');

module.exports = class ActionBarView {
    constructor() {
        this.element = document.createElement('action-bar');
        this.element.classList.add('action-bar');

        this.omnibar = new Omnibar();
        this.element.appendChild(this.omnibar.element);

        this.leftPanel = document.createElement('div');
        this.leftPanel.classList.add('action-bar-left');
        this.element.appendChild(this.leftPanel);
        this.element.leftPanel = this.leftPanel;

        this.rightPanel = document.createElement('div');
        this.rightPanel.classList.add('action-bar-right');
        this.element.appendChild(this.rightPanel);
        this.element.rightPanel = this.rightPanel;

        this.leftTiles = [];
        this.rightTiles = [];

        this.element.getLeftTiles = this.getLeftTiles.bind(this);
        this.element.getRightTiles = this.getRightTiles.bind(this);
        this.element.addLeftTile = this.addLeftTile.bind(this);
        this.element.addRightTile = this.addRightTile.bind(this);

        return this.element;
    }

    destroy() {
        this.activeItemSubscription.dispose();
        this.element.remove();
    }

    addLeftTile(options) {
        let newItem = options.item;
        let newPriority = (options && !_.isUndefined(options.priority)) ? options.priority : this.leftTiles[0].priority + 1;
        let nextItem = null;
        let insertIndex = 0;

        for (let [index, {priority, item}] of this.leftTiles.entries()) {
            insertIndex = index;

            if (priority > newPriority) {
                nextItem = item;
                break;
            }
        }

        let newTile = new Tile(newItem, newPriority, this.leftTiles);
        this.leftTiles.splice(insertIndex, 0, newTile);

        let newElement = via.views.getView(newItem);
        let nextElement = via.views.getView(nextItem);
        this.leftPanel.insertBefore(newElement, nextElement);

        return newTile;
    }

    addRightTile(options) {
        let newItem = options.item;
        let newPriority = (options && !_.isUndefined(options.priority)) ? options.priority : this.rightTiles[0].priority + 1;
        let nextItem = null;
        let insertIndex = 0;

        for (let [index, {priority, item}] of this.rightTiles.entries()) {
            insertIndex = index;

            if (priority < newPriority) {
                nextItem = item;
                break;
            }
        }

        let newTile = new Tile(newItem, newPriority, this.rightTiles);
        this.rightTiles.splice(insertIndex, 0, newTile);

        let newElement = via.views.getView(newItem);
        let nextElement = via.views.getView(nextItem);
        this.rightPanel.insertBefore(newElement, nextElement);

        return newTile;
    }

    getLeftTiles() {
        return this.leftTiles;
    }

    getRightTiles() {
        return this.rightTiles;
    }
}