import { NavOutlet, NavOutletElement, RouteChain, RouteID } from './interfaces';

export function writeNavState(root: HTMLElement, chain: RouteChain|null, index: number, direction: number): Promise<void> {
  if (!chain || index >= chain.length) {
    return Promise.resolve();
  }
  const route = chain[index];
  const node = searchNavNode(root);
  if (!node) {
    return Promise.resolve();
  }
  return node.componentOnReady()
    .then(() => node.setRouteId(route.id, route.params, direction))
    .then(result => {
      if (result.changed) {
        direction = 0;
      }
      const nextEl = node.getContainerEl();
      const promise = (nextEl)
        ? writeNavState(nextEl, chain, index + 1, direction)
        : Promise.resolve();

      if (result.markVisible) {
        return promise.then(() => result.markVisible());
      }
      return promise;
    });
}

export function readNavState(node: HTMLElement) {
  const ids: RouteID[] = [];
  let pivot: NavOutlet|null;
  while (true) {
    pivot = searchNavNode(node);
    if (pivot) {
      const id = pivot.getRouteId();
      if (id) {
        node = pivot.getContainerEl();
        ids.push(id);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return {ids, pivot};
}

const QUERY = 'ion-nav,ion-tabs';

function searchNavNode(root: HTMLElement): NavOutletElement {
  if (root.matches(QUERY)) {
    return root as NavOutletElement;
  }
  return root.querySelector(QUERY);
}
