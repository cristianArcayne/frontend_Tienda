import {
  Component,
  HostBinding,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core';
import { NavItem } from './nav-item';
import { Router } from '@angular/router';
import { NavService } from '../../../../services/nav.service';
import { PermisosService } from '../../../../services/permisos.service';

import { TranslateModule } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-item',
  imports: [TranslateModule, TablerIconsModule, MaterialModule, CommonModule],
  templateUrl: './nav-item.component.html',
  styleUrls: [],
})
export class AppNavItemComponent implements OnChanges, OnInit {
  @Output() notify: EventEmitter<boolean> = new EventEmitter<boolean>();

  @Input() item: NavItem | any;

  expanded: any = false;
  puedeVer = true;

  @HostBinding('attr.aria-expanded') ariaExpanded = this.expanded;
  @Input() depth: any;

  constructor(
    public navService: NavService,
    public router: Router,
    private permisosService: PermisosService
  ) {}

  ngOnInit() {
    this.verificarPermisos();
  }

  ngOnChanges() {
    this.verificarPermisos();
    const url = this.navService.currentUrl();
    if (this.item.route && url) {
      this.expanded = url.indexOf(`/${this.item.route}`) === 0;
      this.ariaExpanded = this.expanded;
    }
  }

  /**
   * Verificar si el usuario tiene permisos para ver este item
   */
  private verificarPermisos(): void {
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
    if (!item.children || !item.children.length) {
      this.router.navigate([item.route]);
    }
    if (item.children && item.children.length) {
      this.expanded = !this.expanded;
    }
    //scroll
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    if (!this.expanded) {
      if (window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }

  openExternalLink(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  onSubItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      if (this.expanded && window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }
}
