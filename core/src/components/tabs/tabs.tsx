import { Build, Component, Element, Event, EventEmitter, Listen, Method, Prop, State } from '@stencil/core';
import { Config, NavOutlet } from '../../index';
import { RouteID, RouteWrite } from '../router/utils/interfaces';


@Component({
  tag: 'ion-tabs',
  styleUrl: 'tabs.scss'
})
export class Tabs implements NavOutlet {

  private ids = -1;
  private transitioning = false;
  private tabsId: number = (++tabIds);
  private leavingTab: HTMLIonTabElement | undefined;

  @Element() el: HTMLElement;

  @State() tabs: HTMLIonTabElement[] = [];
  @State() selectedTab: HTMLIonTabElement | undefined;

  @Prop({ context: 'config' }) config: Config;

  /**
   * The color to use from your Sass `$colors` map.
   * Default options are: `"primary"`, `"secondary"`, `"tertiary"`, `"success"`, `"warning"`, `"danger"`, `"light"`, `"medium"`, and `"dark"`.
   * For more information, see [Theming your App](/docs/theming/theming-your-app).
   */
  @Prop() color: string;

  /**
   * A unique name for the tabs
   */
  @Prop() name: string;

  /**
   * If true, the tabbar
   */
  @Prop() tabbarHidden = false;

  /**
   * Set the tabbar layout: `icon-top`, `icon-start`, `icon-end`, `icon-bottom`, `icon-hide`, `title-hide`.
   */
  @Prop({ mutable: true }) tabbarLayout: string;

  /**
   * Set position of the tabbar: `top`, `bottom`.
   */
  @Prop({ mutable: true }) tabbarPlacement: string;

  /**
   * If true, show the tab highlight bar under the selected tab.
   */
  @Prop({ mutable: true }) tabbarHighlight: boolean;

  /**
   * If true, the tabs will be translucent.
   * Note: In order to scroll content behind the tabs, the `fullscreen`
   * attribute needs to be set on the content.
   * Defaults to `false`.
   */
  @Prop() translucent = false;

  @Prop() scrollable = false;

  /**
   * Emitted when the tab changes.
   */
  @Event() ionChange: EventEmitter;
  @Event() ionNavChanged: EventEmitter<any>;

  componentWillLoad() {
    this.loadConfig('tabsPlacement', 'bottom');
    this.loadConfig('tabsLayout', 'icon-top');
    this.loadConfig('tabsHighlight', true);
  }

  componentDidLoad() {
    return this.initTabs().then(() => this.initSelect());
  }

  componentDidUnload() {
    this.tabs.length = 0;
    this.selectedTab = this.leavingTab = undefined;
  }

  @Listen('ionTabbarClick')
  protected tabChange(ev: CustomEvent) {
    const selectedTab = ev.detail as HTMLIonTabElement;
    this.select(selectedTab);
  }

  /**
   * @param {number|Tab} tabOrIndex Index, or the Tab instance, of the tab to select.
   */
  @Method()
  select(tabOrIndex: number | HTMLIonTabElement): Promise<boolean> {
    const selectedTab = this.getTab(tabOrIndex);
    if (!this.shouldSwitch(selectedTab)) {
      return Promise.resolve(false);
    }
    return this.setActive(selectedTab)
      .then(() => this.notifyRouter())
      .then(() => this.tabSwitch());
  }

  @Method()
  setRouteId(id: string): Promise<RouteWrite> {
    const selectedTab = this.getTab(id);
    if (!this.shouldSwitch(selectedTab)) {
      return Promise.resolve({changed: false});
    }
    return this.setActive(selectedTab).then(() => ({
      changed: true,
      markVisible: () => { this.tabSwitch(); }
    }));
  }

  @Method()
  getTab(tabOrIndex: string | number | HTMLIonTabElement): HTMLIonTabElement {
    if (typeof tabOrIndex === 'string') {
      return this.tabs.find(tab => tab.getTabId() === tabOrIndex);
    }
    if (typeof tabOrIndex === 'number') {
      return this.tabs[tabOrIndex];
    }
    return tabOrIndex;
  }

  /**
   * @return {HTMLIonTabElement} Returns the currently selected tab
   */
  @Method()
  getSelected(): HTMLIonTabElement | undefined {
    return this.selectedTab;
  }

  @Method()
  getRouteId(): RouteID|null {
    const id = this.selectedTab && this.selectedTab.getTabId();
    return id ? {id} : null;
  }

  @Method()
  getContainerEl(): HTMLElement {
    return this.selectedTab;
  }

  private initTabs() {
    const tabs = this.tabs = Array.from(this.el.querySelectorAll('ion-tab'));
    const tabPromises = tabs.map(tab => {
      const id = `t-${this.tabsId}-${++this.ids}`;
      tab.btnId = 'tab-' + id;
      tab.id = 'tabpanel-' + id;
      return tab.componentOnReady();
    });

    return Promise.all(tabPromises);
  }

  private initSelect(): Promise<void> {
    if (document.querySelector('ion-router')) {
      if (Build.isDev) {
        const selectedTab = this.tabs.find(t => t.selected);
        if (selectedTab) {
          console.warn('When using a router (ion-router) <ion-tab selected="true"> makes no difference' +
          'Define routes properly the define which tab is selected');
        }
      }
      return Promise.resolve();
    }
    // find pre-selected tabs
    const selectedTab = this.tabs.find(t => t.selected) ||
      this.tabs.find(t => t.show && !t.disabled);

    // reset all tabs none is selected
    for (const tab of this.tabs) {
      if (tab !== selectedTab) {
        tab.selected = false;
      }
    }
    const promise = selectedTab ? selectedTab.setActive() : Promise.resolve(null);
    return promise.then(() => {
      this.selectedTab = selectedTab;
      if (selectedTab) {
        selectedTab.selected = true;
        selectedTab.active = true;
      }
    });
  }

  private loadConfig(attrKey: string, fallback: any) {
    const val = (this as any)[attrKey];
    if (typeof val === 'undefined') {
      (this as any)[attrKey] = this.config.get(attrKey, fallback);
    }
  }

  private setActive(selectedTab: HTMLIonTabElement): Promise<void> {
    if (this.transitioning) {
      return Promise.reject('transitioning already happening');
    }

    if (!selectedTab) {
      return Promise.reject('no tab is selected');
    }

    // Reset rest of tabs
    for (const tab of this.tabs) {
      if (selectedTab !== tab) {
        tab.selected = false;
      }
    }

    this.transitioning = true;
    this.leavingTab = this.selectedTab;
    this.selectedTab = selectedTab;
    return selectedTab.setActive();
  }

  private tabSwitch(): boolean {
    const selectedTab = this.selectedTab;
    const leavingTab = this.leavingTab;

    this.leavingTab = undefined;
    this.transitioning = false;
    if (!selectedTab) {
      return false;
    }

    selectedTab.selected = true;
    if (leavingTab !== selectedTab) {
      if (leavingTab) {
        leavingTab.active = false;
      }
      this.ionChange.emit(selectedTab);
      this.ionNavChanged.emit({isPop: false});
      return true;
    }
    return false;
  }

  private notifyRouter() {
    const router = document.querySelector('ion-router');
    if (router) {
      return router.navChanged(false);
    }
    return Promise.resolve();
  }

  private shouldSwitch(selectedTab: HTMLIonTabElement) {
    const leavingTab = this.selectedTab;
    return selectedTab && selectedTab !== leavingTab && !this.transitioning;
  }

  render() {
    const dom = [
      <div class='tabs-inner'>
        <slot></slot>
      </div>
    ];

    if (!this.tabbarHidden) {
      dom.push(
        <ion-tabbar
          tabs={this.tabs}
          color={this.color}
          selectedTab={this.selectedTab}
          highlight={this.tabbarHighlight}
          placement={this.tabbarPlacement}
          layout={this.tabbarLayout}
          translucent={this.translucent}
          scrollable={this.scrollable}>
        </ion-tabbar>
      );
    }
    return dom;
  }
}

let tabIds = -1;


