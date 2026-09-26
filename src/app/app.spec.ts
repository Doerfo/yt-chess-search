import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';

@Component({ template: '<p>Shell route fixture</p>' })
class ShellRouteFixture {}

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '', component: ShellRouteFixture }])],
    }).compileComponents();
  });

  it('renders the branded shell and marks Search as the current page', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const shell = fixture.nativeElement as HTMLElement;
    const brand = shell.querySelector<HTMLAnchorElement>('.brand');
    const searchLink = shell.querySelector<HTMLAnchorElement>('.nav-link');

    expect(shell.querySelector('header[role="banner"]')).not.toBeNull();
    expect(brand?.getAttribute('aria-label')).toBe('YouTube Chess Search home');
    expect(brand?.querySelectorAll('.brand-square')).toHaveLength(4);
    expect(shell.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(searchLink?.textContent?.trim()).toBe('Search');
    expect(searchLink?.getAttribute('aria-current')).toBe('page');
    expect(shell.querySelector('router-outlet')).not.toBeNull();
  });
});
