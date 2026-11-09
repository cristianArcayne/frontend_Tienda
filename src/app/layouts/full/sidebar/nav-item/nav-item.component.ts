import {
  Component,
  HostBinding,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  forwardRef,
} from '@angular/core';
import { NavItem } from './nav-item';
import { Router, NavigationEnd } from '@angular/router';
import { NavService } from '../../../../services/nav.service';
import { PermisosService } from '../../../../services/permisos.service';
import { AuthService } from '../../../../services/auth.service';

import { TranslateModule } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-nav-item',
  imports: [TranslateModule, TablerIconsModule, MaterialModule, CommonModule, forwardRef(() => AppNavItemComponent)],
  templateUrl: './nav-item.component.html',
  styleUrls: [],
})
export class AppNavItemComponent implements OnChanges, OnInit, OnDestroy {
  @Output() notify: EventEmitter<boolean> = new EventEmitter<boolean>();

  @Input() item: NavItem | any;
  @Input() depth: number = 0;

  expanded: boolean = false;
  puedeVer: boolean = true;

  @HostBinding('attr.aria-expanded') ariaExpanded = this.expanded;

  private routerSub: Subscription = Subscription.EMPTY;

  constructor(
    public navService: NavService,
    public router: Router,
    private permisosService: PermisosService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.verificarPermisos();
    this.checkIfActive();

    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkIfActive();
      });
  }

  ngOnChanges() {
    this.verificarPermisos();
    this.checkIfActive();
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  private checkIfActive(): void {
    const url = this.router.url || '';
    if (this.item && this.item.children && this.item.children.length && url) {
      const isAnyChildActive = this.item.children.some(
        (child: NavItem) => child.route && (url === child.route || url.startsWith(child.route + '/') || url.startsWith(child.route + '?'))
      );
      if (isAnyChildActive) {
        this.expanded = true;
        this.ariaExpanded = true;
      }
    } else if (this.item && this.item.route && url) {
      if (url === this.item.route || url.startsWith(this.item.route + '/')) {
        this.expanded = true;
        this.ariaExpanded = true;
      }
    }
  }

  /**
   * Verificar si el usuario tiene permisos para ver este item o alguno de sus hijos
   */
  private verificarPermisos(): void {
    if (!this.item) {
      this.puedeVer = true;
      return;
    }

    if (this.item.hideForSuperadmin && this.authService.isSuperuser()) {
      this.puedeVer = false;
      return;
    }

    if (this.item.onlySuperadmin) {
      this.puedeVer = this.authService.isSuperuser();
      return;
    }

    if (this.item.onlyTenantAdmin && (!this.authService.isAdmin() || this.authService.isSuperuser())) {
      this.puedeVer = false;
      return;
    }

    if (this.item.onlyAdmin && !this.authService.isAdmin()) {
      this.puedeVer = false;
      return;
    }

    // Si tiene hijos, es visible si al menos un hijo tiene permiso
    if (this.item.children && this.item.children.length) {
      this.puedeVer = this.item.children.some((child: NavItem) => {
        if (child.hideForSuperadmin && this.authService.isSuperuser()) return false;
        if (child.onlySuperadmin) return this.authService.isSuperuser();
        if (child.onlyTenantAdmin && (!this.authService.isAdmin() || this.authService.isSuperuser())) return false;
        if (child.onlyAdmin && !this.authService.isAdmin()) return false;
        if (!child.permiso) return true;
        if (Array.isArray(child.permiso)) return this.permisosService.tieneAlguno(child.permiso);
        return this.permisosService.tiene(child.permiso);
      });
      return;
    }

    if (!this.item.permiso) {
      this.puedeVer = true;
      return;
    }

    if (Array.isArray(this.item.permiso)) {
      this.puedeVer = this.permisosService.tieneAlguno(this.item.permiso);
    } else {
      this.puedeVer = this.permisosService.tiene(this.item.permiso);
    }
  }

  onItemSelected(item: NavItem) {
    if (item.children && item.children.length) {
      this.expanded = !this.expanded;
      this.ariaExpanded = this.expanded;
      return;
    }

    if (item.route) {
      if (item.queryParams) {
        this.router.navigate([item.route], { queryParams: item.queryParams });
      } else {
        this.router.navigate([item.route]);
      }
      if (window.innerWidth < 1024) {
        this.notify.emit(true);
      }
    }
  }

  openExternalLink(url: string | undefined): void {
    if (url) {
      window.open(url, '_blank');
    }
  }
}
